import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import type { Job } from '@prisma/client';
import { VertexAI, Part } from '@google-cloud/vertexai';
import { createClient, DeepgramError } from '@deepgram/sdk';
import path from 'path';
import { generateV4ReadSignedUrl } from '../../lib/gcs';
import fs from 'fs';
import os from 'os';

const prisma = new PrismaClient();

// --- Services Configuration ---
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// --- VertexAI Authentication Setup ---
// Decode the service account key from environment variables
const serviceAccountB64 = process.env.GCP_SERVICE_ACCOUNT_B64;
if (!serviceAccountB64) {
  throw new Error('GCP_SERVICE_ACCOUNT_B64 environment variable is not set.');
}
const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
const credentials = JSON.parse(serviceAccountJson);

// In a serverless environment, we write credentials to a temporary file
// and set the GOOGLE_APPLICATION_CREDENTIALS env var to point to it.
const credentialsPath = path.join(os.tmpdir(), 'gcp-credentials.json');
fs.writeFileSync(credentialsPath, serviceAccountJson);
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

// Now, initialize VertexAI. It will automatically find the credentials via the
// GOOGLE_APPLICATION_CREDENTIALS environment variable.
const vertex_ai = new VertexAI({
    project: credentials.project_id,
    location: 'us-central1',
});

const generativeModel = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
});
const textModel = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
});


// --- TYPE DEFINITIONS AND CONFIGS ---
interface ProcedureStepConfig { key: string; name: string; }
interface EvaluationStep { score: number; time: string; comments: string; }
interface GeminiEvaluationResult {
    [key: string]: EvaluationStep | number | string | undefined;
    caseDifficulty: number;
    additionalComments: string;
    transcription?: string;
}
interface EvaluationConfigs { [key: string]: { procedureSteps: ProcedureStepConfig[]; }; }
const EVALUATION_CONFIGS: EvaluationConfigs = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space' }, { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space' }, { key: 'meshPlacement', name: 'Mesh Placement' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Laparoscopic Cholecystectomy': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" }, { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' }, { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' }, { key: 'specimenRemoval', name: 'Specimen removal' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Robotic Cholecystectomy': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" }, { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' }, { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' }, { key: 'specimenRemoval', name: 'Specimen removal' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'robotDocking', name: 'Docking the robot' }, { key: 'instrumentPlacement', name: 'Instrument Placement' }, { key: 'herniaReduction', name: 'Reduction of Hernia' }, { key: 'flapCreation', name: 'Flap Creation' }, { key: 'meshPlacement', name: 'Mesh Placement/Fixation' }, { key: 'flapClosure', name: 'Flap Closure' }, { key: 'undocking', name: 'Undocking/trocar removal' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Robotic Lap Ventral Hernia Repair (TAPP)': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'robotDocking', name: 'Docking the robot' }, { key: 'instrumentPlacement', name: 'Instrument Placement' }, { key: 'herniaReduction', name: 'Reduction of Hernia' }, { key: 'flapCreation', name: 'Flap Creation' }, { key: 'herniaClosure', name: 'Hernia Closure' }, { key: 'meshPlacement', name: 'Mesh Placement/Fixation' }, { key: 'flapClosure', name: 'Flap Closure' }, { key: 'undocking', name: 'Undocking/trocar removal' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
    'Laparoscopic Appendicectomy': { procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix' }, { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base' }, { key: 'specimenExtraction', name: 'Specimen Extraction' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ] },
};

// --- AUDIO-ONLY ANALYSIS FUNCTIONS ---

async function transcribeWithDeepgram(urlForTranscription: string): Promise<string> {
    console.log(`Starting audio transcription with Deepgram...`);
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl( { url: urlForTranscription }, { model: 'nova-2', diarize: true, punctuate: true, utterances: true } );
    if (error) throw new DeepgramError(error.message);
    const utterances = result.results?.utterances;
    if (!utterances || utterances.length === 0) return "Transcription returned no utterances.";
    return utterances.map(utt => `[Speaker ${utt.speaker}] (${utt.start.toFixed(2)}s): ${utt.transcript}`).join('\n');
}



// --- VIDEO ANALYSIS FUNCTION ---

const getMimeTypeFromGcsUri = (gcsUri: string): string => {
    const extension = path.extname(gcsUri).toLowerCase();
    if (extension === '.mov') return 'video/quicktime';
    if (extension === '.mp4') return 'video/mp4';
    return 'video/mp4'; 
};

// In pages/api/process-job.ts

// --- PROMPT IMPROVEMENT: More detailed and structured prompt with JSON example ---
async function evaluateTranscript(transcription: string, surgeryName: string, additionalContext: string): Promise<GeminiEvaluationResult> {
    console.log('Starting text-based evaluation with JSON mode...');
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    const stepKeys = config.procedureSteps.map(s => `"${s.key}": { "score": ..., "time": "...", "comments": "..." }`).join(',\n    ');

    const prompt = `
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on the provided transcript for the **${surgeryName}** procedure.

      **CONTEXT:**
      - **Procedure:** ${surgeryName}
      - **Additional Context:** ${additionalContext || 'None'}
      - **Transcript:** A full transcript with speaker labels and timestamps is provided below.

      **PRIMARY INSTRUCTIONS:**
      1.  **Analyze the Transcript:** Review the entire transcript and context. Identify the resident (learner) and the attending (teacher). Focus the evaluation on the resident's performance.
      2.  **Evaluate Step-by-Step:** For each surgical step, provide a detailed evaluation.
          - **Scoring Scale (1-5):**
            - **1:** Unsafe, attending took over.
            - **2:** Performed <50% of step, significant help needed.
            - **3:** Performed >50% but still needed assistance.
            - **4:** Completed with coaching and guidance.
            - **5:** Completed independently and proficiently.
          - **If a step was NOT performed:** Use a score of 0, time "N/A", and comment "This step was not performed or mentioned."
      3.  **Provide Overall Assessment:**
          - \`caseDifficulty\`: (Number 1-3) Rate the case difficulty (1=Low, 2=Moderate, 3=High).
          - \`additionalComments\`: (String) Provide a concise summary of the resident's overall performance.
      
      4.  **JSON OUTPUT FORMAT:** You MUST return ONLY a single, valid JSON object matching this exact structure. Do not include any other text or markdown formatting.

      \`\`\`json
      {
        "caseDifficulty": <number>,
        "additionalComments": "<string>",
        ${stepKeys}
      }
      \`\`\`

      **TRANSCRIPT FOR ANALYSIS:**
      ---
      ${transcription}
      ---
    `;

    const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
        },
    };
    
    const result = await textModel.generateContent(request);
    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
        throw new Error("Failed to get a valid response from text model.");
    }
    
    try {
        return JSON.parse(responseText) as GeminiEvaluationResult;
    } catch (error) {
        console.error("Failed to parse JSON from text model. Raw response:", responseText);
        throw new Error("AI model returned invalid JSON.");
    }
}

// --- PROMPT IMPROVEMENT: More detailed and structured prompt with JSON example ---
async function evaluateVideo(surgeryName: string, additionalContext: string, gcsUri: string): Promise<GeminiEvaluationResult> {
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    console.log(`Starting video evaluation with GCS URI: ${gcsUri}`);
    const stepKeys = config.procedureSteps.map(s => `"${s.key}": { "score": ..., "time": "...", "comments": "..." }`).join(',\n    ');

    const prompt = `
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on the provided video for the **${surgeryName}** procedure.

      **CONTEXT:**
      - **Procedure:** ${surgeryName}
      - **Additional Context:** ${additionalContext || 'None'}
      - **Video:** A video of the surgical procedure is provided.

      **PRIMARY INSTRUCTIONS:**
      1.  **Transcribe the Audio:** First, provide a complete and accurate transcription of all spoken dialogue in the video.
      2.  **Analyze the Procedure:** Review the entire video, transcription, and context. Identify the resident (learner) and the attending (teacher). Focus the evaluation on the resident's performance.
      3.  **Evaluate Step-by-Step:** For each surgical step, provide a detailed evaluation.
          - **Scoring Scale (1-5):**
            - **1:** Unsafe, attending took over.
            - **2:** Performed <50% of step, significant help needed.
            - **3:** Performed >50% but still needed assistance.
            - **4:** Completed with coaching and guidance.
            - **5:** Completed independently and proficiently.
          - **If a step was NOT performed:** Use a score of 0, time "N/A", and comment "This step was not performed or mentioned."
      4.  **Provide Overall Assessment:**
          - \`caseDifficulty\`: (Number 1-3) Rate the case difficulty (1=Low, 2=Moderate, 3=High).
          - \`additionalComments\`: (String) Provide a concise summary of the resident's overall performance.

      5.  **JSON OUTPUT FORMAT:** You MUST return ONLY a single, valid JSON object matching this exact structure. Do not include any other text or markdown formatting.

      \`\`\`json
      {
        "transcription": "<string>",
        "caseDifficulty": <number>,
        "additionalComments": "<string>",
        ${stepKeys}
      }
      \`\`\`
    `;

    const filePart: Part = { fileData: { mimeType: getMimeTypeFromGcsUri(gcsUri), fileUri: gcsUri } };
    const request = {
        contents: [{ role: 'user', parts: [filePart, { text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
        },
    };

    const result = await generativeModel.generateContent(request);
    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
        throw new Error("Failed to get a valid response from the video model.");
    }

    try {
        return JSON.parse(responseText) as GeminiEvaluationResult;
    } catch(error) {
        console.error("Failed to parse JSON from video model. Raw response:", responseText);
        throw new Error("AI model returned invalid JSON.");
    }
}

// --- MAIN JOB PROCESSING LOGIC ---

async function processJob(job: Job) {
    console.log(`Processing job ${job.id} for surgery: ${job.surgeryName}`);
    const { gcsObjectPath, gcsUrl, surgeryName, residentName, additionalContext, withVideo, videoAnalysis } = job;

    if (!gcsUrl || !gcsObjectPath) {
        throw new Error(`Job ${job.id} is missing gcsUrl or gcsObjectPath.`);
    }

    let evaluationResult: GeminiEvaluationResult;
    let transcription: string | undefined;

    try {
        if (withVideo && videoAnalysis) {
            try {
                console.log("Visual analysis is enabled. Attempting Vertex AI video evaluation.");
                await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-in-gemini' } });

                const gcsUri = gcsUrl.replace('https://storage.googleapis.com/', 'gs://');
                evaluationResult = await evaluateVideo(surgeryName, additionalContext || '', gcsUri);
                transcription = evaluationResult.transcription;
            } catch (videoError) {
                console.error("Vertex AI video evaluation failed. Falling back to audio-only analysis.", videoError);
                await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-transcription' } });

                const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
                transcription = await transcribeWithDeepgram(readableUrl);
                evaluationResult = await evaluateTranscript(transcription, surgeryName, additionalContext || '');
            }
        } else {
            console.log("Visual analysis is disabled or file is audio-only. Using audio analysis path.");
            await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-transcription' } });

            const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
            transcription = await transcribeWithDeepgram(readableUrl);

            await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-evaluation' } });
            evaluationResult = await evaluateTranscript(transcription, surgeryName, additionalContext || '');
        }

        console.log(`Job ${job.id}: Gemini evaluation complete.`);

        const finalResult = {
            ...evaluationResult,
            transcription,
            surgery: surgeryName,
            residentName: residentName,
            additionalContext: additionalContext,
            isFinalized: false,
        };
        return finalResult;
    } catch(error) {
        console.error(`Error during processing for job ${job.id}:`, error);
        throw error;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'A valid jobId must be provided.' });
    }
    const jobToProcess = await prisma.job.findUnique({ where: { id: jobId } });
    if (!jobToProcess) {
        return res.status(404).json({ message: 'Job not found.' });
    }
    res.status(202).json({ message: `Processing started for job ${jobId}`});
    try {
        const result = await processJob(jobToProcess);
        await prisma.job.update({
            where: { id: jobToProcess.id },
            data: {
                status: 'complete',
                result: JSON.stringify(result),
                error: null,
            },
        });
        console.log(`[Processing] Job ${jobToProcess.id} completed successfully.`);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`[Processing] Job ${jobToProcess.id} failed:`, errorMessage);
        await prisma.job.update({
            where: { id: jobToProcess.id },
            data: {
                status: 'failed',
                error: errorMessage,
            },
        });
    }
}