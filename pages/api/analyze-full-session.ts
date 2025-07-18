import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPrismaClient } from '../../lib/prisma';
import { uploadFileToGCS, getPublicUrl } from '../../lib/gcs';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const config = {
    api: {
        bodyParser: false,
    },
};

async function getGeminiResponse(prompt: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
}

const getFieldValue = (fieldValue: string | string[] | undefined): string | undefined => {
    return Array.isArray(fieldValue) ? fieldValue[0] : fieldValue;
};

const getFile = (fileValue: File | File[] | undefined): File | undefined => {
    return Array.isArray(fileValue) ? fileValue[0] : fileValue;
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
        const surgeryName = getFieldValue(fields.surgery);
        const liveNotes = getFieldValue(fields.liveNotes);
        const fullTranscript = getFieldValue(fields.fullTranscript);
        const audioFile = getFile(files.audio);

        if (!residentId || !surgeryName || !fullTranscript || !audioFile) {
             return res.status(400).json({ error: 'Missing required fields: residentId, surgery, fullTranscript, or audio file.' });
        }

        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === surgeryName);
        if (!procedureId) {
            return res.status(400).json({ error: `Configuration for surgery "${surgeryName}" not found.` });
        }
        const config = EVALUATION_CONFIGS[procedureId];
        
        const destination = `uploads/live_session_${Date.now()}.webm`;
        await uploadFileToGCS(audioFile.filepath, destination);
        fs.unlinkSync(audioFile.filepath);

        const stepKeys = config.procedureSteps.map(s => `"${s.key}": { "score": <number>, "time": "<string>", "comments": "<string>" }`).join(',\n    ');
        
        const finalPrompt = `
You are Veritas, an AI surgical assistant performing a final, comprehensive evaluation. Analyze the full procedure transcript to generate a definitive surgical evaluation based on the R.I.S.E Veritas-Scale.

**Procedure:** ${surgeryName}
**Resident ID:** ${residentId}

**Task:**
Analyze the full transcript. Identify each surgical step, determine time taken, assign a score from 1-5, and write a concise feedback summary for each step, citing evidence from the dialogue. Use the 'Live AI Notes' for context on actions taken by the AI.

**R.I.S.E Veritas Scale:**
- 5: Completed independently, little to no verbal help.
- 4: Completed with only verbal coaching.
- 3: Required significant physical assistance.
- 2: Performed less than 50% before attending took over.
- 1: Observed only or unsafe attempt.
- 0: Step not performed or mentioned.

**Data for Analysis:**

**1. Full Procedure Transcript:**
---
${fullTranscript}
---

**2. Live AI Notes (for context):**
${liveNotes || 'No live notes were recorded.'}

**Required Output Format:**
Return ONLY a single, valid JSON object with this exact structure:
{
  "caseDifficulty": <number>,
  "additionalComments": "<string>",
  ${stepKeys}
}
`;
        
        const evaluationData = await getGeminiResponse(finalPrompt);
        const resident = await prisma.resident.findUnique({ where: { id: residentId } });

        const finalResult = {
            ...evaluationData,
            transcription: fullTranscript,
            surgery: surgeryName,
            residentName: resident?.name,
            residentEmail: resident?.email,
            isFinalized: false,
        };

        const newJob = await prisma.job.create({
            data: {
                residentId: residentId,
                surgeryName: surgeryName,
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