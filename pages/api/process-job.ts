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

async function evaluateTranscript(transcription: string, surgeryName: string, additionalContext: string): Promise<GeminiEvaluationResult> {
    console.log('Starting text-based evaluation with JSON mode...');
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    const prompt = `
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on a transcript and the provided context.
      **Procedure:** ${surgeryName}
      **Additional Context to Consider:**
      ---
      ${additionalContext || 'None'}
      ---
      **Transcript with Speaker Labels:**
      ---
      ${transcription}
      ---
      **Instructions:**
      1.  Review all the information provided.
      2.  If the transcript is too short or lacks meaningful surgical dialogue, you MUST refuse to evaluate. Return a JSON object where 'additionalComments' explains why the evaluation is not possible, 'caseDifficulty' is 0, and all step scores are 0.
      3.  For EACH procedure step listed, evaluate the resident's performance based on the transcript.
          * **If a step WAS performed:**
              * 'score': (Number 1-5) based on a standard surgical scoring scale (1=unsafe, 5=expert).
              * 1: Unsafe, attending took over (Resident observed only or attempted but was unsafe; attending performed the step.)
              * 2: Performed <50% of step. (Resident performed less than 50% of the step before the attending took over.)
              * 3: Performed >50% but needed assistance. (Resident performed more than 50% of the step but required assistance.)
              * 4: Completed with coaching. (Resident completed the entire step with coaching or guidance from the attending.)
              * 5: Completed independently. (Resident completed the entire step independently, without assistance.)
      - If a step was not performed, the score MUST be 0
              * 'time': (String) Estimate the time spent on this step in the format "X minutes Y seconds" by analyzing timestamps.
              * 'comments': (String) Provide DETAILED, constructive feedback.
          * **If a step was NOT performed or mentioned:**
              * 'score': 0
              * 'time': "N/A"
              * 'comments': "This step was not performed or mentioned."
      4.  **Overall Assessment:**
          * 'caseDifficulty': (Number 1-3) Analyze the entire transcript to determine the overall case difficulty (1=Low, 2=Moderate, 3=High).
          * 'additionalComments': (String) Provide a concise summary of the resident's overall performance.
      5.  **Return ONLY the JSON object.** The entire response must be a single JSON object.`;

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

async function evaluateVideo(surgeryName: string, additionalContext: string, gcsUri: string): Promise<GeminiEvaluationResult> {
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    console.log(`Starting video evaluation with GCS URI: ${gcsUri}`);

    const prompt = `
      You are an expert surgical education analyst. Based on the provided video, provide a detailed evaluation for ${surgeryName}.
      Additional Context: ${additionalContext || 'None'}
      
      **Instructions:**
      - Provide a full transcription of the audio under a "transcription" key.
      - Provide a "caseDifficulty" as a single integer ONLY: 1, 2, or 3.
      - Provide a concise summary in "additionalComments".
      - For each procedure step, provide a nested object with "score", "time", and "comments".
      - The "score" MUST be an integer between 1 and 5, based on this scale:
        1: Unsafe, attending took over (Resident observed only or attempted but was unsafe; attending performed the step.)
        2: Performed <50% of step. (Resident performed less than 50% of the step before the attending took over.)
        3: Performed >50% but needed assistance. (Resident performed more than 50% of the step but required assistance.)
        4: Completed with coaching. (Resident completed the entire step with coaching or guidance from the attending.)
        5: Completed independently. (Resident completed the entire step independently, without assistance.)
      - If a step was not performed, the score MUST be 0
      - For each step, provide "score", "comments", and the estimated "time" in a "minutes:seconds" format (e.g., "2 Minutes and 35 seconds").
      - Return ONLY a single, valid JSON object with the specified keys: "transcription", "caseDifficulty", "additionalComments", ${config.procedureSteps.map(s=>`"${s.key}"`).join(', ')}.`;

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