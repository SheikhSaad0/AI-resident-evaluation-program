// lib/process-job.ts

import { Job, Resident } from '@prisma/client';
import { VertexAI, Part } from '@google-cloud/vertexai';
import { createClient, DeepgramError } from '@deepgram/sdk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getPrismaClient } from './prisma'; // Correct: Use the async getter
import { generateV4ReadSignedUrl } from './gcs';

// ... (keep all the service configuration, type definitions, and helper functions the same)
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
    model: 'gemini-2.5-flash',
});
const textModel = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
});

// --- TYPE DEFINITIONS AND CONFIGS ---
interface ProcedureStepConfig { key: string; name: string; }
interface EvaluationStep { score: number; time: string; comments:string; }
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
    },
    openUmbilical: {
        1: 'Easy: Small fascial defect (<2 cm), minimal subcutaneous tissue, no prior abdominal surgeries, no incarceration, and straightforward reduction. Excellent exposure with minimal dissection required.',
        2: 'Moderate: Medium-sized hernia (2–4 cm), presence of moderate subcutaneous fat, minor adhesions or partial incarceration, requiring careful dissection or tension at closure. May involve mild bleeding or minor wound concerns.',
        3: 'Difficult: Large hernia defect (>4 cm), thickened or scarred sac from prior surgeries, dense adhesions, incarcerated or non-reducible contents, or challenging exposure due to obesity or previous mesh. May require layered closure or drains despite no formal mesh placement.'
    },
    openVentralRetrorectus: {
        1: 'Easy: Defect <5 cm with minimal to no adhesions, good-quality fascia, and no prior mesh or wound infection. Retrorectus space is easily developed, mesh placement is tension-free, and closure is achieved without undue difficulty; may or may not need drains.',
        2: 'Moderate: Defect 5–10 cm, moderate adhesions requiring careful lysis, prior abdominal surgeries without mesh, or modest scarring. Retrorectus dissection requires moderate effort; mesh placement and fascial closure are feasible but require precision. One or more drains may be placed.',
        3: 'Difficult: Large or complex defect >10 cm, dense adhesions from multiple prior surgeries or mesh explantation, scarred or attenuated posterior sheath, and need for advanced exposure techniques (e.g., component separation). Retrorectus dissection is challenging, and closure may require reinforcement, advanced techniques, or staged approaches. Significant bleeding risk or compromised soft tissue envelope may be present.'
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
        procedureSteps: [ { key: 'portPlacement', name: 'Port Placement' }, { key: 'robotDocking', name: 'Docking the robot' }, { key: 'instrumentPlacement', name: 'Instrument Placement' }, { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle" }, { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct' }, { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver' }, { key: 'specimenRemoval', name: 'Specimen removal' }, { key: 'portClosure', name: 'Port Closure' }, { key: 'skinClosure', name: 'Skin Closure' }, ],
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
    'Open Umbilical Hernia Repair Without Mesh': {
        procedureSteps: [
            { key: 'skinIncision', name: 'Skin Incision and Dissection to Hernia Sac' },
            { key: 'sacIsolation', name: 'Hernia Sac Isolation & Opening' },
            { key: 'contentReduction', name: 'Reduction of Hernia Contents' },
            { key: 'fasciaClosure', name: 'Closure of Fascia' },
            { key: 'subcutaneousClosure', name: 'Subcutaneous tissue Re-approximation' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.openUmbilical,
    },
    'Open VHR with Retrorectus Mesh': {
        procedureSteps: [
            { key: 'midlineIncision', name: 'Midline Incision and Hernia Exposure' },
            { key: 'adhesiolysis', name: 'Adhesiolysis and Hernia Sac Dissection' },
            { key: 'retrorectusCreation', name: 'Posterior Rectus Sheath Incision & Retrorectus Space Creation' },
            { key: 'posteriorClosure', name: 'Posterior Rectus Sheath Closure & Hernia Content Reduction' },
            { key: 'meshPlacement', name: 'Mesh Placement in Retrorectus Plane' },
            { key: 'drainPlacement', name: 'Closed Drain Placement' },
            { key: 'anteriorFascialClosure', name: 'Anterior Fascial Closure' },
            { key: 'skinClosure', name: 'Skin Closure' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.openVentralRetrorectus,
    },
};

async function transcribeWithDeepgram(urlForTranscription: string): Promise<string> {
    console.log(`[Deepgram] Starting audio transcription with URL: ${urlForTranscription}`);
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl( { url: urlForTranscription }, { model: 'nova-2', diarize: true, punctuate: true, utterances: true } );
    if (error) {
        console.error(`[Deepgram] Error during transcription:`, error);
        throw new DeepgramError(error.message);
    }
    console.log(`[Deepgram] Transcription successful, processing utterances...`);
    const utterances = result.results?.utterances;
    if (!utterances || utterances.length === 0) {
        console.warn(`[Deepgram] No utterances found in transcription result`);
        return "Transcription returned no utterances.";
    }
    console.log(`[Deepgram] Found ${utterances.length} utterances`);
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
        
        **SCORING SCALE (0–5):**

        **5 – Full autonomy** Resident completed the step independently, with minimal or no verbal feedback. May include brief confirmation or non-corrective commentary from the attending.

        **4 – Verbal coaching only** Resident completed the full step with moderate to heavy **verbal** instruction.  
        ✅ Extensive coaching is fine — as long as **the attending did not perform the step or intervene physically in a corrective way**.

        **3 – Physical assistance or redo required** Resident completed >50% of the step, but:
        - Required physical help to correct technique (e.g., attending adjusted angle, guided a needle, loaded a clip)
        - Attending gave explicit redo instructions with partial physical involvement
        - Resident performed the task incorrectly at first and attending physically intervened to fix it

        **2 – Shared or corrected performance** Attending had to co-perform the step due to error or inefficiency:
        - Resident could not complete a subtask without attending taking over
        - Attending re-did a portion due to technical error

        **1 – Incomplete or unsafe** Resident failed to perform the step; attending took over for safety or completion

        **0 – Step not done / no info**

        ---

        **SCORING PRINCIPLES**

        - **Verbal guidance ≠ deduction.** Even step-by-step verbal coaching earns a 4 **if the resident physically performs the task**.

        - **Physical help ≠ takeover** — unless procedural.  
        ✅ *Examples of acceptable physical help that **should NOT reduce score**:* - Handing over instruments  
        - Holding tissue briefly to improve visibility  
        - Adjusting camera angle or retraction  
        - Repositioning a tool without performing the task  
        These are considered *facilitative support*, not takeover.

        - **True "taking over" means performing part of the step themselves.** Only deduct for **procedural actions** — cutting, suturing, dissecting, tying, clipping, etc.

        - **Redo alone doesn’t justify a 3.** If the resident corrects the mistake on their own, still score a 4.

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
        // Clean the response text to remove potential markdown and whitespace
        const cleanedText = responseText.trim().replace(/^```json\s*/, '').replace(/```$/, '');
        return JSON.parse(cleanedText) as GeminiEvaluationResult;
    } catch (error) {
        console.error("Failed to parse JSON from text model. Raw response:", responseText);
        throw new Error("AI model returned invalid JSON.");
    }
}

async function evaluateVideo(surgeryName: string, additionalContext: string, gcsUri: string, transcription: string): Promise<GeminiEvaluationResult> {
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    console.log(`Starting video evaluation with GCS URI: ${gcsUri}`);
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
            - Do not make up information about what the attending says, avoid direct quotes, just evaluate each step effectively, if there was no attending comment for that step, mention that.
            - Be as accurate as you can, when the transcript is silent, assume that the surgeons are operating
            - When an attending is talking, without mention of them taking over or verbal cues that they did take over, assume the resident is performing the procedure as they are being the ones evaluated, by default they are doing the surgery.
            - Use the transcripts timestamps and the procedure steps estimated time to asses where in the case the attending and resident might be, the attending may give the score out verbally after completing a section of the case.
            - Listen in to the random comments made by the attending throughout the case and take note of those comments to be later used in the additional comments/overall score section of the finished evaluation.
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
        // Clean the response text to remove potential markdown and whitespace
        const cleanedText = responseText.trim().replace(/^```json\s*/, '').replace(/```$/, '');
        const parsedResult = JSON.parse(cleanedText) as GeminiEvaluationResult;
        parsedResult.transcription = transcription;
        return parsedResult;
    } catch(error) {
        console.error("Failed to parse JSON from video model. Raw response:", responseText);
        throw new Error("AI model returned invalid JSON.");
    }
}


export async function processJob(jobWithDetails: Job & { resident: Resident | null }, prismaClient?: any) {
    const prisma = prismaClient || getPrismaClient();

    console.log(`[ProcessJob] Starting job ${jobWithDetails.id} for surgery: ${jobWithDetails.surgeryName}`);
    console.log(`[ProcessJob] Using prisma client: ${prismaClient ? 'provided' : 'default'}`);
    const { id, gcsUrl, gcsObjectPath, surgeryName, additionalContext, withVideo, videoAnalysis, resident } = jobWithDetails;

    // The gcsUrl and gcsObjectPath will now point to the first file.
    // In a more advanced implementation, you would loop through all files.
    if (!gcsUrl || !gcsObjectPath) {
        console.error(`[ProcessJob] Missing required fields - gcsUrl: ${gcsUrl}, gcsObjectPath: ${gcsObjectPath}`);
        throw new Error(`Job ${id} is missing gcsUrl or gcsObjectPath.`);
    }

    console.log(`[ProcessJob] Processing job with:`, {
        gcsUrl,
        gcsObjectPath,
        withVideo,
        videoAnalysis,
        surgeryName,
        residentName: resident?.name
    });

    let evaluationResult: GeminiEvaluationResult;
    let transcription: string | undefined;

    try {
        if (withVideo && videoAnalysis) {
            try {
                console.log("[ProcessJob] Visual analysis is enabled. Starting transcription...");
                await prisma.job.update({ where: { id }, data: { status: 'processing-transcription' } });
                
                console.log(`[ProcessJob] Generating signed URL for: ${gcsObjectPath}`);
                const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
                console.log(`[ProcessJob] Generated signed URL: ${readableUrl}`);
                
                transcription = await transcribeWithDeepgram(readableUrl);

                console.log("[ProcessJob] Transcription complete. Starting Vertex AI video evaluation...");
                await prisma.job.update({ where: { id }, data: { status: 'processing-in-gemini' } });
                const gcsUri = gcsUrl.replace('https://storage.googleapis.com/', 'gs://');
                console.log(`[ProcessJob] Using GCS URI for video evaluation: ${gcsUri}`);
                evaluationResult = await evaluateVideo(surgeryName, additionalContext || '', gcsUri, transcription);

            } catch (videoError) {
                console.error("[ProcessJob] Vertex AI video evaluation failed. Falling back to audio-only analysis.", videoError);
                await prisma.job.update({ where: { id }, data: { status: 'processing-transcription' } });

                if (!transcription) {
                    console.log("[ProcessJob] Re-generating signed URL for audio-only transcription...");
                    const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
                    transcription = await transcribeWithDeepgram(readableUrl);
                }
                console.log("[ProcessJob] Starting audio-only evaluation...");
                evaluationResult = await evaluateTranscript(transcription, surgeryName, additionalContext || '');
            }
        } else {
            console.log("[ProcessJob] Visual analysis disabled or file is audio-only. Using audio analysis path.");
            await prisma.job.update({ where: { id }, data: { status: 'processing-transcription' } });

            console.log(`[ProcessJob] Generating signed URL for audio analysis: ${gcsObjectPath}`);
            const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
            console.log(`[ProcessJob] Generated signed URL: ${readableUrl}`);
            transcription = await transcribeWithDeepgram(readableUrl);

            console.log("[ProcessJob] Starting transcript evaluation...");
            await prisma.job.update({ where: { id }, data: { status: 'processing-evaluation' } });
            evaluationResult = await evaluateTranscript(transcription, surgeryName, additionalContext || '');
        }

        console.log(`Job ${id}: Gemini evaluation complete.`);

        const finalResult = {
            ...evaluationResult,
            transcription,
            surgery: surgeryName,
            residentName: resident?.name,
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
        console.error(`[ProcessJob] Job ${id} failed with error:`, error);
        console.error(`[ProcessJob] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        await prisma.job.update({
            where: { id },
            data: {
                status: 'failed',
                error: errorMessage,
            },
        });
    }
}