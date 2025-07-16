// pages/api/analyze-full-session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import { createClient, DeepgramClient } from '@deepgram/sdk';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Prisma and AI clients
const prisma = new PrismaClient();
const deepgram: DeepgramClient = createClient(process.env.DEEPGRAM_API_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Disable Next.js's default body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper function to parse Gemini's JSON response
async function getGeminiResponse(prompt: string) {
    // FIX: Using the exact model name as requested.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Clean the response to ensure it's valid JSON
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
}

// Helper to safely get a single value from formidable fields
const getFieldValue = (fieldValue: string | string[] | undefined): string | undefined => {
    if (Array.isArray(fieldValue)) {
        return fieldValue[0];
    }
    return fieldValue;
};

// Helper to safely get a single file from formidable files
const getFile = (fileValue: File | File[] | undefined): File | undefined => {
    if (Array.isArray(fileValue)) {
        return fileValue[0];
    }
    return fileValue;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = formidable({ keepExtensions: true });

    try {
        const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        const residentId = getFieldValue(fields.residentId);
        const surgery = getFieldValue(fields.surgery);
        const liveNotes = getFieldValue(fields.liveNotes);
        const audioFile = getFile(files.audio);

        if (!residentId || !surgery || !liveNotes || !audioFile) {
             return res.status(400).json({ error: 'Missing required fields: residentId, surgery, liveNotes, or audio file.' });
        }

        // 1. Get full transcript from the recorded audio file
        const audioBuffer = fs.readFileSync(audioFile.filepath);
        const { result, error: deepgramError } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            // FIX: Using the exact model name as requested.
            { model: 'nova-2', punctuate: true, utterances: true }
        );

        if (deepgramError) throw deepgramError;
        
        // Clean up the uploaded file after transcription
        fs.unlinkSync(audioFile.filepath); 
        
        const fullTranscript = result?.results?.channels[0]?.alternatives[0]?.transcript ?? '';
        if (!fullTranscript) {
            return res.status(500).json({ error: 'Failed to generate transcript from audio.' });
        }

        // 2. Construct a detailed final prompt for Gemini
        const finalPrompt = `
            You are Veritas, an AI surgical assistant performing a final, comprehensive evaluation for the R.I.S.E Veritas-Scale.

            **Procedure Details:**
            - Surgery: ${surgery}
            - Resident ID: ${residentId}

            **Task:**
            Analyze the provided data to generate a definitive surgical evaluation. You have two sources of information:
            1.  **Live AI Notes:** A JSON array of actions, scores, and comments logged by the AI in real-time during the procedure. This provides a preliminary sketch of the events.
            2.  **Full Procedure Transcript:** The complete, detailed transcript of the entire operation. This is the primary source of truth.

            Your task is to synthesize these two sources. Use the full transcript to confirm, correct, and expand upon the live notes. Identify each key surgical step mentioned in the transcript, determine the time taken for each, assign a precise score from 1-5 based on the R.I.S.E. scale definitions, and write a concise feedback summary for each step, citing evidence from the transcript.

            **R.I.S.E Veritas Scale:**
            - 1: Observed only or unsafe attempt; attending took over completely.
            - 2: Performed less than 50% of the step before attending took over.
            - 3: Performed more than 50% but required significant physical assistance.
            - 4: Completed the entire step with only verbal coaching or minor guidance.
            - 5: Completed the entire step independently and safely, with no assistance.

            **Data for Analysis:**

            **1. Live AI Notes (for context):**
            ${liveNotes}

            **2. Full Procedure Transcript (Primary Source):**
            ---
            ${fullTranscript}
            ---

            **Required Output Format:**
            Return ONLY a single, valid JSON object. Do not include any text, markdown formatting, or explanations before or after the JSON object.
            The JSON object must have this exact structure:
            {
              "overallFeedback": "A 2-3 sentence summary of the resident's overall performance, highlighting strengths and key areas for improvement.",
              "steps": [
                { "name": "Name of the Surgical Step", "score": <number>, "duration": "<X minutes>", "feedback": "Specific, evidence-based feedback for this step." }
              ]
            }
        `;

        // 3. Get the final structured JSON analysis from Gemini
        const evaluationData = await getGeminiResponse(finalPrompt);

        // 4. Save the complete evaluation to the database
        const newEvaluation = await prisma.evaluation.create({
            data: {
                residentId: residentId,
                procedure: surgery,
                overallFeedback: evaluationData.overallFeedback,
                transcript: fullTranscript,
                steps: {
                    create: evaluationData.steps.map((step: any) => ({
                        name: step.name,
                        score: parseInt(step.score, 10), // Ensure score is an integer
                        duration: step.duration,
                        feedback: step.feedback,
                    })),
                },
            },
        });
        
        res.status(200).json({ evaluationId: newEvaluation.id });

    } catch (error) {
        console.error('Error in analyze-full-session:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: `Failed to process session: ${errorMessage}` });
    }
}