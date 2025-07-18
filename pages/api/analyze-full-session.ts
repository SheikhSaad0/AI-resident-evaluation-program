import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPrismaClient } from '../../lib/prisma';
import { uploadFileToGCS, getPublicUrl } from '../../lib/gcs';

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Disable Next.js's default body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper function to parse Gemini's JSON response
async function getGeminiResponse(prompt: string) {
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
    const prisma = await getPrismaClient();

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
        const fullTranscript = getFieldValue(fields.fullTranscript); // Get the full conversation
        const audioFile = getFile(files.audio);

        if (!residentId || !surgery || !fullTranscript || !audioFile) {
             return res.status(400).json({ error: 'Missing required fields: residentId, surgery, fullTranscript, or audio file.' });
        }

        // 1. Upload audio to GCS for archival
        const destination = `uploads/live_session_${Date.now()}.webm`;
        await uploadFileToGCS(audioFile.filepath, destination);
        fs.unlinkSync(audioFile.filepath); // Clean up temp file

        // 2. Construct a detailed final prompt for Gemini
        // ✅ THIS PROMPT NOW USES THE COMPLETE TRANSCRIPT AS THE PRIMARY SOURCE
        const finalPrompt = `
            You are Veritas, an AI surgical assistant performing a final, comprehensive evaluation for the R.I.S.E Veritas-Scale.

            **Procedure Details:**
            - Surgery: ${surgery}
            - Resident ID: ${residentId}

            **Task:**
            Analyze the provided full procedure transcript to generate a definitive surgical evaluation. This transcript contains the complete dialogue, including both the resident's speech and the AI's (Veritas's) interactions. The 'Live AI Notes' are provided for additional context on specific actions taken by the AI.

            Your task is to synthesize this information. Identify each key surgical step mentioned in the transcript, determine the time taken for each, assign a precise score from 1-5 based on the R.I.S.E. scale definitions, and write a concise feedback summary for each step, citing evidence from the dialogue.

            **R.I.S.E Veritas Scale:**
            - 1: Observed only or unsafe attempt; attending took over completely.
            - 2: Performed less than 50% of the step before attending took over.
            - 3: Performed more than 50% but required significant physical assistance.
            - 4: Completed the entire step with only verbal coaching, little to none physical assistance.
            - 5: Completed the entire step independently, with no assistance, and little to none verbal help.

            **SCORING PRINCIPLES**

        - **Verbal guidance ≠ deduction.**  
        Even step-by-step verbal coaching earns a 4 **if the resident physically performs the task**.

        - **Physical help ≠ takeover** — unless procedural.  
        ✅ *Examples of acceptable physical help that **should NOT reduce score**:*  
        - Handing over instruments  
        - Holding tissue briefly to improve visibility  
        - Adjusting camera angle or retraction  
        - Repositioning a tool without performing the task  
        These are considered *facilitative support*, not takeover.

        - **True "taking over" means performing part of the step themselves.**  
        Only deduct for **procedural actions** — cutting, suturing, dissecting, tying, clipping, etc.

        - **Redo alone doesn’t justify a 3.**  
        If the resident corrects the mistake on their own, still score a 4.

        - **In unclear situations, lean toward higher score unless the attending did part of the step themselves.**

        ---

        - **If a step was NOT performed:** Use a score of 0, time "N/A", and comment "This step was not performed or mentioned."
        - Do not make up information about what the attending says, avoid direct quotes, just evaluate each step effectively, if there was no attending comment for that step, mention that.
        - Be as accurate as you can, when the transcript is silent, assume that the surgeons are operating
        - When an attending is talking, without mention of them taking over or verbal cues that they did take over, assume the resident is performing the procedure as they are being the ones evaluated, by default they are doing the surgery.
        - Use the transcripts timestamps and the procedure steps estimated time to asses where in the case the attending and resident might be, the attending may give the score out verbally after completing a section of the case.
        - Listen in to the random comments made by the attending throughout the case and take note of those comments to be later used in the additional comments/overall score section of the finished evaluation.
        - unless the attending EXPLICITLY states that they are taking over, assume the resident is in full control
        - know the difference between the attending speaking / guiding and taking over, if the attending is speaking and acting like he is doing the procedure, but the resident is doing the same, assume the resident is operating, take timestamps into consideration as well, they will verbally ASK to switch in, it is never silent
        - Take into account random mishaps or accidents that may happen in the OR
        - use context clues to differentiate coaching and acting from the attending, things like "let me scrub in now" or "give me that" are some examples
        - keep into account that speak 0 and 1 labels may not be very accurate in the transcript
        - keep in mind, even if the residents makes mistakes or does something wrong and is corrected by the attending verbally, under all circumstances that the attending does nott physically have to take over or do the step, the resident is awarded at minimum a score of 4 for that step, this is due to the fact they only had verbal coachiing and no interference from the attending
        - always assume that the resident is performing the procedure, even when the attending gives negative comments on the resident's performance, example: a bad and dangerous performance from a resident but no intervention from the attending is still a score of 4 - write the negative things as an additional comment of the step, a resident who is doing great and only given some tips throughout a step is also just a 4 at minimum.
        - we can define a 5 as done without intensive coaching (This can be defined as constant direction and comments from the attending for a step, a few comments before he does the step would generally not count), the attending may speak but overall the resident probably would have been fine if the attending did not make any comments at all, this is up to evaluate based on context
    
            **Data for Analysis:**

            **1. Full Procedure Transcript (Primary Source of Truth):**
            ---
            ${fullTranscript}
            ---

            **2. Live AI Notes (for context on AI actions):**
            ${liveNotes || 'No live notes were recorded.'}


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

        // 4. Fetch resident data to include in the result
        const resident = await prisma.resident.findUnique({ where: { id: residentId } });

        // 5. Create a new Job record with the evaluation data
        const finalResult = {
            ...evaluationData,
            transcription: fullTranscript, // Save the complete transcript
            surgery: surgery,
            residentName: resident?.name,
            isFinalized: false,
        };

        const newJob = await prisma.job.create({
            data: {
                residentId: residentId,
                surgeryName: surgery,
                status: 'complete',
                gcsUrl: getPublicUrl(destination),
                gcsObjectPath: destination,
                result: JSON.stringify(finalResult),
                withVideo: false, 
                videoAnalysis: false,
            },
        });
        
        res.status(200).json({ evaluationId: newJob.id });

    } catch (error) {
        console.error('Error in analyze-full-session:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: `Failed to process session: ${errorMessage}` });
    }
}