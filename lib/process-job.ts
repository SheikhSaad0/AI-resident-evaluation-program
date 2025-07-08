import { Job, Resident } from '@prisma/client'; // Correct import
import { VertexAI, Part } from '@google-cloud/vertexai';
import { createClient, DeepgramError } from '@deepgram/sdk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { prisma } from './prisma';
import { generateV4ReadSignedUrl } from './gcs';

// ... (the rest of the file remains the same)

// --- Services Configuration ---
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// --- VertexAI Authentication Setup ---
const serviceAccountB64 = process.env.GCP_SERVICE_ACCOUNT_B64;
if (!serviceAccountB64) {
  throw new Error('GCP_SERVICE_ACCOUNT_B64 environment variable is not set.');
}
const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
const credentials = JSON.parse(serviceAccountJson);

const credentialsPath = path.join(os.tmpdir(), 'gcp-credentials.json');
fs.writeFileSync(credentialsPath, serviceAccountJson);
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

const vertex_ai = new VertexAI({
    project: credentials.project_id,
    location: 'us-central1',
});

const generativeModel = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash', // Corrected to a valid model name
});
const textModel = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash', // Corrected to a valid model name
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

const difficultyDescriptions = {
    standard: {
        1: 'Low Difficulty: Primary, straightforward case with normal anatomy and no prior abdominal or pelvic surgeries. Minimal dissection required; no significant adhesions or anatomical distortion.',
        2: 'Moderate Difficulty: Case involves mild to moderate adhesions or anatomical variation. May include BMI-related challenges, large hernias, or prior unrelated abdominal surgeries not directly affecting the operative field.',
        3: 'High Difficulty: Redo or complex case with prior related surgeries (e.g., prior hernia repair, laparotomy). Significant adhesions, distorted anatomy, fibrosis, or other factors requiring advanced dissection and judgment.'
    },
    lapAppy: {
        1: 'Low: Primary, straightforward case with normal anatomy',
        2: 'Moderate: Mild adhesions or anatomical variation',
        3: 'High: Dense adhesions, distorted anatomy, prior surgery, or perforated/complicated appendicitis'
    }
};

interface EvaluationConfigs {
    [key: string]: {
        procedureSteps: ProcedureStepConfig[];
        caseDifficultyDescriptions: { [key: number]: string };
    };
}

const EVALUATION_CONFIGS: EvaluationConfigs = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': {
        procedureSteps: [ { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space' }, { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space' }, { key: 'meshPlacement', name: 'Mesh Placement' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Laparoscopic Cholecystectomy': {
        procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" }, { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' }, { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' }, { key: 'specimenRemoval', name: 'Specimen removal' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Robotic Cholecystectomy': {
        procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" }, { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' }, { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' }, { key: 'specimenRemoval', name: 'Specimen removal' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)': {
        procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'robotDocking', name: 'Docking the robot' }, { key: 'instrumentPlacement', name: 'Instrument Placement' }, { key: 'herniaReduction', name: 'Reduction of Hernia' }, { key: 'flapCreation', name: 'Flap Creation' }, { key: 'meshPlacement', name: 'Mesh Placement/Fixation' }, { key: 'flapClosure', name: 'Flap Closure' }, { key: 'undocking', name: 'Undocking/trocar removal' }, { key: 'skinClosure', name: 'Skin Closure' }, ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Robotic Lap Ventral Hernia Repair (TAPP)': {
        procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'robotDocking', name: 'Docking the robot' }, { key: 'instrumentPlacement', name: 'Instrument Placement' }, { key: 'herniaReduction', name: 'Reduction of Hernia' }, { key: 'flapCreation', name: 'Flap Creation' }, { key: 'herniaClosure', name: 'Hernia Closure' }, { key: 'meshPlacement', name: 'Mesh Placement/Fixation' }, { key: 'flapClosure', name: 'Flap Closure' }, { key: 'undocking', name: 'Undocking/trocar removal' }, { key: 'skinClosure', name: 'Skin Closure' }, ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Laparoscopic Appendicectomy': {
        procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix' }, { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base' }, { key: 'specimenExtraction', name: 'Specimen Extraction' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ],
        caseDifficultyDescriptions: difficultyDescriptions.lapAppy,
    },
};

async function transcribeWithDeepgram(urlForTranscription: string): Promise<string> {
    console.log(`Starting audio transcription with Deepgram...`);
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl( { url: urlForTranscription }, { model: 'nova-2', diarize: true, punctuate: true, utterances: true } );
    if (error) throw new DeepgramError(error.message);
    const utterances = result.results?.utterances;
    if (!utterances || utterances.length === 0) return "Transcription returned no utterances.";
    return utterances.map(utt => `[Speaker ${utt.speaker}] (${utt.start.toFixed(2)}s): ${utt.transcript}`).join('\n');
}

const getMimeTypeFromGcsUri = (gcsUri: string): string => {
    const extension = path.extname(gcsUri).toLowerCase();
    if (extension === '.mov') return 'video/quicktime';
    if (extension === '.mp4') return 'video/mp4';
    if (extension === '.webm') return 'video/webm';
    return 'video/mp4';
};

async function evaluateTranscript(transcription: string, surgeryName: string, additionalContext: string): Promise<GeminiEvaluationResult> {
    console.log('Starting text-based evaluation with JSON mode...');
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    const stepKeys = config.procedureSteps.map(s => `"${s.key}": { "score": ..., "time": "...", "comments": "..." }`).join(',\n    ');
    const difficultyText = Object.entries(config.caseDifficultyDescriptions)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n          ');

    const prompt = `
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on the provided transcript for the **${surgeryName}** procedure.

      **CONTEXT:**
      - **Procedure:** ${surgeryName}
      - **Additional Context:** ${additionalContext || 'None'}
      - **Transcript:** A full transcript with speaker labels and timestamps is provided below.

      **PRIMARY INSTRUCTIONS:**
      1.  **Analyze the Transcript:** Review the entire transcript and context. Identify the resident (learner) and the attending (teacher). Focus the evaluation on the resident's performance.
      2.  **Evaluate Step-by-Step:** For each surgical step, provide a detailed evaluation, include comments the attending may have given that can criique and improve the residents future performance
          - **Scoring Scale (1-5):**
            - **1:** Unsafe, attending took over.
            - **2:** Performed <50% of step, significant help needed.
            - **3:** Performed >50% but still needed assistance.
            - **4:** Completed with coaching and guidance.
            - **5:** Completed independently and proficiently.
          - **If a step was NOT performed:** Use a score of 0, time "N/A", and comment "This step was not performed or mentioned."
      3.  **Provide Overall Assessment:**
          - **\`caseDifficulty\`**: (Number 1-3) Rate the case difficulty based on the following procedure-specific scale:
          ${difficultyText}
          - **\`additionalComments\`**: (String) Provide a concise summary of the resident's overall performance, include key details to their performance and ideas for improvement
        Record the time taken, the format should be "X minutes and Y seconds", where one step might have taken 4 minutes and 22 seconds
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

async function evaluateVideo(surgeryName: string, additionalContext: string, gcsUri: string): Promise<GeminiEvaluationResult> {
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    console.log(`Starting video evaluation with GCS URI: ${gcsUri}`);
    const stepKeys = config.procedureSteps.map(s => `"${s.key}": { "score": ..., "time": "...", "comments": "..." }`).join(',\n    ');
    const difficultyText = Object.entries(config.caseDifficultyDescriptions)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n          ');

    const prompt = `
      You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on the provided video for the **${surgeryName}** procedure.

      **CONTEXT:**
      - **Procedure:** ${surgeryName}
      - **Additional Context:** ${additionalContext || 'None'}
      - **Video:** A video of the surgical procedure is provided.

      **PRIMARY INSTRUCTIONS:**
      1.  **Transcribe the Audio:** First, provide a complete and accurate transcription of all spoken dialogue in the video.
      2.  **Analyze the Procedure:** Review the entire video, transcription, and context. Identify the resident (learner) and the attending (teacher). Focus the evaluation on the resident's performance. Evaluate the residents movements and skills against the transcript and attendings comments, evaluate how well a job the resident is doing and if they are 'practice ready' (being able to do the surgery accurately).
      3.  **Evaluate Step-by-Step:** For each surgical step, provide a detailed evaluation, include comments the attending may have given that can criique and improve the residents future performance
          - **Scoring Scale (1-5):**
            - **1:** Unsafe, attending took over.
            - **2:** Performed <50% of step, significant help needed.
            - **3:** Performed >50% but still needed assistance.
            - **4:** Completed with coaching and guidance.
            - **5:** Completed independently and proficiently.
          - **If a step was NOT performed:** Use a score of 0, time "N/A", and comment "This step was not performed or mentioned."
      4.  **Provide Overall Assessment:**
          - **\`caseDifficulty\`**: (Number 1-3) Rate the case difficulty based on the following procedure-specific scale:
          ${difficultyText}
          - **\`additionalComments\`**: (String) Provide a concise summary of the resident's overall performance, include key details to their performance and ideas for improvement
       Record the time taken, the format should be "X minutes and Y seconds", where one step might have taken 4 minutes and 22 seconds, take into consideration the video provided may be a teaching example and not a full procedure from start to finish, so then estimate the time accurately.
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


export async function processJob(jobWithDetails: Job & { resident: Resident | null }) {
    console.log(`Processing job ${jobWithDetails.id} for surgery: ${jobWithDetails.surgeryName}`);
    const { id, gcsObjectPath, gcsUrl, surgeryName, additionalContext, withVideo, videoAnalysis, resident } = jobWithDetails;

    if (!gcsUrl || !gcsObjectPath) {
        throw new Error(`Job ${id} is missing gcsUrl or gcsObjectPath.`);
    }

    let evaluationResult: GeminiEvaluationResult;
    let transcription: string | undefined;

    try {
        if (withVideo && videoAnalysis) {
            try {
                console.log("Visual analysis is enabled. Attempting Vertex AI video evaluation.");
                await prisma.job.update({ where: { id }, data: { status: 'processing-in-gemini' } });

                const gcsUri = gcsUrl.replace('https://storage.googleapis.com/', 'gs://');
                evaluationResult = await evaluateVideo(surgeryName, additionalContext || '', gcsUri);
                transcription = evaluationResult.transcription;
            } catch (videoError) {
                console.error("Vertex AI video evaluation failed. Falling back to audio-only analysis.", videoError);
                await prisma.job.update({ where: { id }, data: { status: 'processing-transcription' } });

                const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
                transcription = await transcribeWithDeepgram(readableUrl);
                evaluationResult = await evaluateTranscript(transcription, surgeryName, additionalContext || '');
            }
        } else {
            console.log("Visual analysis is disabled or file is audio-only. Using audio analysis path.");
            await prisma.job.update({ where: { id }, data: { status: 'processing-transcription' } });

            const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
            transcription = await transcribeWithDeepgram(readableUrl);

            await prisma.job.update({ where: { id }, data: { status: 'processing-evaluation' } });
            evaluationResult = await evaluateTranscript(transcription, surgeryName, additionalContext || '');
        }

        console.log(`Job ${id}: Gemini evaluation complete.`);

        const finalResult = {
            ...evaluationResult,
            transcription,
            surgery: surgeryName,
            residentName: resident?.name, // Correctly access resident name
            additionalContext: additionalContext,
            isFinalized: false,
        };
        
        await prisma.job.update({
            where: { id },
            data: {
                status: 'complete',
                result: JSON.stringify(finalResult),
                error: null,
            },
        });
        console.log(`[Processing] Job ${id} completed successfully.`);

    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Processing] Job ${id} failed:`, errorMessage);
        await prisma.job.update({
            where: { id },
            data: {
                status: 'failed',
                error: errorMessage,
            },
        });
    }
}