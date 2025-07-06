import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import type { Job } from '@prisma/client';
import { VertexAI, Part } from '@google-cloud/vertexai';
import { createClient, DeepgramError } from '@deepgram/sdk';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { generateV4ReadSignedUrl } from '../../lib/gcs';
import fs from 'fs';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';

const prisma = new PrismaClient();

// --- Services Configuration ---
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// --- Cloud Services Authentication & Setup ---
const serviceAccountB64 = process.env.GCP_SERVICE_ACCOUNT_B64;
if (!serviceAccountB64) {
  throw new Error('GCP_SERVICE_ACCOUNT_B64 environment variable is not set.');
}
const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
const credentials = JSON.parse(serviceAccountJson);

const storage = new Storage({
    projectId: credentials.project_id,
    credentials,
});
const bucketName = process.env.GCS_BUCKET_NAME;
if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable not set.');
}
const bucket = storage.bucket(bucketName);

const credentialsPath = path.join(os.tmpdir(), 'gcp-credentials.json');
fs.writeFileSync(credentialsPath, serviceAccountJson);
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

const vertex_ai = new VertexAI({
    project: credentials.project_id,
    location: 'us-central1',
});

// Using a specific, versioned model name for stability.
const modelIdentifier = 'gemini-2.5-flash';
const generativeModel = vertex_ai.getGenerativeModel({ model: modelIdentifier });
const textModel = vertex_ai.getGenerativeModel({ model: modelIdentifier });


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


// --- HELPER FUNCTIONS ---
function robustJsonParse(responseText: string): GeminiEvaluationResult {
    try {
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("Could not find a valid JSON object in the response.");
        }
        const jsonString = responseText.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Robust JSON parsing failed. Raw response:", responseText);
        const message = e instanceof Error ? e.message : "Unknown parsing error";
        throw new Error(`Failed to parse JSON: ${message}`);
    }
}

async function transcribeWithDeepgram(urlForTranscription: string): Promise<string> {
    console.log(`Starting audio transcription with Deepgram...`);
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl({ url: urlForTranscription }, { model: 'nova-2', diarize: true, punctuate: true, utterances: true });
    if (error) throw new DeepgramError(error.message);
    const utterances = result.results?.utterances;
    return utterances?.map(utt => `[Speaker ${utt.speaker}] (${utt.start.toFixed(2)}s): ${utt.transcript}`).join('\n') || "Transcription returned no utterances.";
}

async function callGenerativeModel(model: any, requestContents: any[]): Promise<GeminiEvaluationResult> {
    const request = {
        contents: requestContents,
        generationConfig: {
            responseMimeType: "application/json",
        },
    };
    const streamingResp = await model.generateContentStream(request);
    const aggregatedResponse = await streamingResp.response;
    const responseText = aggregatedResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("Failed to get a valid response from the model.");
    return robustJsonParse(responseText);
}

const getMimeTypeFromGcsUri = (gcsUri: string): string => {
    const extension = path.extname(gcsUri).toLowerCase();
    if (extension === '.mov') return 'video/quicktime';
    if (extension === '.mp4') return 'video/mp4';
    if (extension === '.webm') return 'video/webm';
    return 'video/mp4';
};

const buildEvaluationPrompt = (surgeryName: string, additionalContext: string, withTranscription: boolean): string => {
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    const transcriptionInstruction = withTranscription ? '- Provide a full transcription of the audio under a "transcription" key.' : '';
    return `You are a surgical education analyst. Your task is to provide a structured JSON evaluation.
        Procedure: ${surgeryName}
        Additional Context: ${additionalContext || 'None'}.
        
        Instructions:
        ${transcriptionInstruction}
        - Provide a "caseDifficulty" as a single integer (1-3).
        - Provide a concise summary in "additionalComments".
        - For each procedure step, provide a nested object with "score" (integer 1-5, or 0 if not performed), "time" (string "X minutes Y seconds"), and "comments" (string).
        - Your entire response must be ONLY a single, valid JSON object with the specified keys.
        - The keys are: "caseDifficulty", "additionalComments", ${withTranscription ? '"transcription", ' : ''}${config.procedureSteps.map(s => `"${s.key}"`).join(', ')}.`;
};


// --- MAIN JOB PROCESSING LOGIC ---
async function processJob(job: Job) {
    console.log(`Processing job ${job.id} for surgery: ${job.surgeryName}`);
    const { gcsObjectPath, surgeryName, residentName, additionalContext, withVideo, videoAnalysis } = job;

    if (!gcsObjectPath) throw new Error(`Job ${job.id} is missing gcsObjectPath.`);

    let evaluationResult: GeminiEvaluationResult;
    let transcription: string | undefined;
    let thumbnailUrl: string | null = null;

    if (withVideo) {
        console.log(`Generating thumbnail for job ${job.id}...`);
        const tempVideoPath = path.join(os.tmpdir(), job.id + path.extname(gcsObjectPath));
        const tempThumbFilename = `${job.id}.jpg`;
        const tempThumbPath = path.join(os.tmpdir(), tempThumbFilename);
        
        try {
            await bucket.file(gcsObjectPath).download({ destination: tempVideoPath });
            await new Promise<void>((resolve, reject) => {
                ffmpeg(tempVideoPath)
                    .on('end', () => resolve())
                    .on('error', (err: Error) => reject(err))
                    .screenshots({ timestamps: ['00:05'], filename: tempThumbFilename, folder: os.tmpdir(), size: '320x240' });
            });
            
            const thumbDestination = `thumbnails/${tempThumbFilename}`;
            await bucket.upload(tempThumbPath, { destination: thumbDestination });
            thumbnailUrl = await generateV4ReadSignedUrl(thumbDestination);
            console.log(`Thumbnail generated and signed URL created.`);
        } catch (thumbError) {
            console.error(`Could not generate thumbnail for job ${job.id}:`, thumbError);
        } finally {
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
        }
    }
    
    try {
        if (withVideo && videoAnalysis) {
            try {
                await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-in-gemini' } });
                const gcsUri = `gs://${bucketName}/${gcsObjectPath}`;
                const prompt = buildEvaluationPrompt(surgeryName, additionalContext || '', true);
                const filePart: Part = { fileData: { mimeType: getMimeTypeFromGcsUri(gcsUri), fileUri: gcsUri } };
                evaluationResult = await callGenerativeModel(generativeModel, [{ role: 'user', parts: [filePart, { text: prompt }] }]);
                transcription = evaluationResult.transcription;
            } catch (videoError) {
                console.error("Vertex AI video evaluation failed. Falling back to audio-only analysis.", videoError);
                await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-transcription' } });
                const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
                transcription = await transcribeWithDeepgram(readableUrl);
                const prompt = buildEvaluationPrompt(surgeryName, additionalContext || '', false);
                evaluationResult = await callGenerativeModel(textModel, [{ role: 'user', parts: [{ text: prompt }, { text: `Transcript:\n${transcription}` }] }]);
            }
        } else {
            await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-transcription' } });
            const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
            transcription = await transcribeWithDeepgram(readableUrl);
            await prisma.job.update({ where: { id: job.id }, data: { status: 'processing-evaluation' } });
            const prompt = buildEvaluationPrompt(surgeryName, additionalContext || '', false);
            evaluationResult = await callGenerativeModel(textModel, [{ role: 'user', parts: [{ text: prompt }, { text: `Transcript:\n${transcription}` }] }]);
        }

        const finalResult = { ...evaluationResult, transcription, surgery: surgeryName, residentName, additionalContext, isFinalized: false };
        return { finalResult, thumbnailUrl };
    } catch(error) {
        console.error(`Error during processing for job ${job.id}:`, error);
        throw error;
    }
}

// --- API Route Handler ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string') return res.status(400).json({ error: 'A valid jobId must be provided.' });
    
    const jobToProcess = await prisma.job.findUnique({ where: { id: jobId } });
    if (!jobToProcess) return res.status(404).json({ message: 'Job not found.' });
    
    res.status(202).json({ message: `Processing started for job ${jobId}`});
    
    try {
        const { finalResult, thumbnailUrl } = await processJob(jobToProcess);
        await prisma.job.update({
            where: { id: jobToProcess.id },
            data: { status: 'complete', result: JSON.stringify(finalResult), thumbnailUrl: thumbnailUrl, error: null },
        });
        console.log(`[Processing] Job ${jobToProcess.id} completed successfully.`);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`[Processing] Job ${jobToProcess.id} failed:`, errorMessage);
        await prisma.job.update({
            where: { id: jobToProcess.id },
            data: { status: 'failed', error: errorMessage },
        });
    }
}