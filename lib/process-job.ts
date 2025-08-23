// lib/process-job.ts

import OpenAI from 'openai';
import { createClient, DeepgramError } from '@deepgram/sdk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getPrismaClient } from './prisma';
import { generateV4ReadSignedUrl, downloadFileAsBuffer } from './r2';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';

// Tell fluent-ffmpeg where to find the ffprobe binary
ffmpeg.setFfprobePath(ffprobeStatic.path);

// --- Services Configuration ---
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// --- OpenAI Setup ---
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

// Helper function to parse HH:mm:ss.ss to seconds
const parseTimemarkToSeconds = (timemark: string): number => {
    const parts = timemark.split(':');
    const seconds = parseFloat(parts.pop() || '0');
    const minutes = parseInt(parts.pop() || '0', 10);
    const hours = parseInt(parts.pop() || '0', 10);
    return (hours * 3600) + (minutes * 60) + seconds;
};

// --- TYPE DEFINITIONS AND CONFIGS ---
interface ProcedureStepConfig { key: string; name: string; }
interface EvaluationStep { score: number; time: string; comments:string; }
interface OpenAIEvaluationResult {
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
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl( { url: urlForTranscription }, { model: 'nova-3', diarize: true, punctuate: true, utterances: true } );
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

const getMimeTypeFromUrl = (url: string): string => {
    const extension = path.extname(url).toLowerCase();
    if (extension === '.mov') return 'video/quicktime';
    if (extension === '.mp4') return 'video/mp4';
    if (extension === '.webm') return 'video/webm';
    return 'video/mp4';
};

async function evaluateTranscript(transcription: string, surgeryName: string, additionalContext: string): Promise<OpenAIEvaluationResult> {
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
        - **Transcript:** A full transcript with speaker labels and timestamps is provided below. Speaker labels may not be accurate, be aware of this.
        
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

        - **Redo alone doesn’t justify a 3.** If the resident corrects the mistake on their own, still score a 4.

        - **In unclear situations, lean toward higher score unless the attending did part of the step themselves.**

        - **True "taking over" means performing part of the step themselves.** Only deduct for **procedural actions** — cutting, suturing, dissecting, tying, clipping, etc.

        - **Redo alone doesn’t justify a 3.** If the resident corrects the mistake on their own, still score a 4.

        - **In unclear situations, lean toward higher score unless the attending did part of the step themselves.**

        - **True "taking over" means performing part of the step themselves.** Only deduct for **procedural actions** — cutting, suturing, dissecting, tying, clipping, etc.

        - **Redo alone doesn’t justify a 3.** If the resident corrects the mistake on their own, still score a 4.

        - **In unclear situations, lean toward higher score unless the attending did part of the step themselves.**

        - **If a step was NOT performed:** Use a score of 0, time "N/A", and comment "This step was not performed or mentioned."
        - Do not make up information about what the attending says, avoid direct quotes, just evaluate each step effectively, if there was no attending comment for that step, mention that.
        - Be as accurate as you can, when the transcript is silent, assume that the surgeons are operating
        - When an attending is talking, without mention of them taking over or verbal cues that they did take over, assume the resident is performing the procedure as they are being the ones evaluated, by default they are doing the surgery.
        - Use the transcripts timestamps and the procedure steps estimated time to asses where in the case the attending and resident might be, the attending may give the score out verbally after completing a section of the case.
        - Listen in to the random comments made by the attending throughout the case and take note of those comments to be later used in the additional comments/overall score section of the finished evaluation.
        - unless the attending EXPLICITLY states that they are taking over, assume the resident is in full control
        - know the difference between the attending speaking / guiding and taking over, do not make up information about what the attending says, avoid direct quotes, just evaluate each step effectively, if there was no attending comment for that step, mention that.
        - be as accurate as you can, when the transcript is silent, assume that the surgeons are operating
        - when an attending is talking, without mention of them taking over or verbal cues that they did take over, assume the resident is performing the procedure as they are being the ones evaluated, by default they are doing the surgery.
        - use the transcripts timestamps and the procedure steps estimated time to asses where in the case the attending and resident might be, the attending may give the score out verbally after completing a section of the case.
        - listen in to the random comments made by the attending throughout the case and take note of those comments to be later used in the additional comments/overall score section of the finished evaluation.
        - unless the attending EXPLICITLY states that they are taking over, assume the resident is in full control
        - know the difference between the attending speaking / guiding and taking over, if the attending is speaking and acting like he is doing the procedure, but the resident is doing the same, assume the resident is operating, take timestamps into consideration as well, they will verbally ASK to switch in, it is never silent
        - take into account random mishaps or accidents that may happen in the OR
        - use context clues to differentiate coaching and acting from the attending, things like "let me scrub in now" or "give me that" are some examples
        - keep into account that speak 0 and 1 labels may not be very accurate in the transcript
        - keep in mind, even if the residents makes mistakes or does something wrong and is corrected by the attending verbally, under all circumstances that the attending does nott physically have to take over or do the step, the resident is awarded at minimum a score of 4 for that step, this is due to the fact they only had verbal coachiing and no interference from the attending
        - always assume that the resident is performing the procedure, even when the attending gives negative comments on the resident's performance, example: a bad and dangerous performance from a resident but no intervention from the attending is still a score of 4 - write the negative things as an additional comment of the step, a resident who is doing great and only given some tips throughout a step is also just a 4 at minimum.
        - keep in mind, steps like port closure, may have the resident TEACHING a medical student, please try to identify this, you can use context clues and discretion to figure this out, most of the time, medical students suture/close with the resident, and the resident teaches them, functioning as an attending, they get a 5 for this
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

    const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            {
                role: "system",
                content: "You are an expert surgical analyst. Respond with only valid JSON matching the requested structure."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        response_format: { type: "json_object" },
    });
    
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
        throw new Error("Failed to get a valid response from text model.");
    }
    
    try {
        const cleanedText = responseText.trim().replace(/^```json\s*/, '').replace(/```$/, '');
        return JSON.parse(cleanedText) as OpenAIEvaluationResult;
    } catch (error) {
        console.error("Failed to parse JSON from text model. Raw response:", responseText);
        throw new Error("AI model returned invalid JSON.");
    }
}

async function evaluateVideo(surgeryName: string, additionalContext: string, r2Url: string, transcription: string): Promise<OpenAIEvaluationResult> {
    const config = EVALUATION_CONFIGS[surgeryName as keyof typeof EVALUATION_CONFIGS];
    console.log(`Starting video evaluation with R2 URL: ${r2Url}`);
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
            - **RISE Scoring Scale (1-5):**
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

    // Note: OpenAI doesn't support direct video analysis like Gemini, 
    // so we'll process this as text-based analysis using the transcription
    console.log(`Starting text-based evaluation for video analysis`);
    
    const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            {
                role: "system",
                content: "You are an expert surgical analyst. Respond with only valid JSON matching the requested structure."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
        throw new Error("Failed to get a valid response from OpenAI video analysis.");
    }

    try {
        const cleanedText = responseText.trim().replace(/^```json\s*/, '').replace(/```$/, '');
        const parsedResult = JSON.parse(cleanedText) as OpenAIEvaluationResult;
        parsedResult.transcription = transcription;
        return parsedResult;
    } catch(error) {
        console.error("Failed to parse JSON from OpenAI video analysis. Raw response:", responseText);
        throw new Error("AI model returned invalid JSON.");
    }
}


export async function processJob(jobWithDetails: any, prismaClient?: any) {
    const prisma = prismaClient || getPrismaClient();

    console.log(`[ProcessJob] Starting job ${jobWithDetails.id} for surgery: ${jobWithDetails.surgeryName}`);
    console.log(`[ProcessJob] Using prisma client: ${prismaClient ? 'provided' : 'default'}`);
    const { id, gcsUrl, gcsObjectPath, surgeryName, additionalContext, withVideo, videoAnalysis, resident } = jobWithDetails;

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

    let evaluationResult: OpenAIEvaluationResult;
    let transcription: string | undefined;
    let audioDuration: number | null | undefined;

    try {
        await prisma.job.update({ where: { id }, data: { status: 'processing-duration-scan' } });

        console.log(`[ProcessJob] Starting DURATION SCAN for job ${id}`);
        const tempFilePath = path.join(os.tmpdir(), `temp_audio_${id}.webm`);

        try {
            const fileContents = await downloadFileAsBuffer(gcsObjectPath);
            fs.writeFileSync(tempFilePath, fileContents);

            audioDuration = await new Promise<number | null>((resolve, reject) => {
                ffmpeg.ffprobe(tempFilePath, (err, data) => {
                    if (err) {
                        console.error(`[ProcessJob] FFprobe error for job ${id}:`, err.message);
                        resolve(null);
                    } else {
                        const durationInSeconds = data?.format?.duration;
                        console.log(`[ProcessJob] FFprobe finished. Duration: ${durationInSeconds}s`);
                        resolve(durationInSeconds ? Math.ceil(durationInSeconds) : null);
                    }
                });
            });

            if (audioDuration && audioDuration > 0) {
                console.log(`[ProcessJob] SUCCESS! Duration found: ${audioDuration}s. Updating database.`);
                await prisma.job.update({ where: { id }, data: { audioDuration: audioDuration } });
            } else {
                console.error(`[ProcessJob] FAILURE: Scan completed but duration was zero or null for job ${id}.`);
            }
        } catch (metaError) {
            console.error(`[ProcessJob] A critical error occurred during duration scan for job ${id}:`, metaError);
        } finally {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }
        
        // Now proceed with transcription and evaluation
        if (withVideo && videoAnalysis) {
            try {
                console.log("[ProcessJob] Visual analysis is enabled. Starting transcription...");
                await prisma.job.update({ where: { id }, data: { status: 'processing-transcription' } });
                
                console.log(`[ProcessJob] Generating signed URL for: ${gcsObjectPath}`);
                const readableUrl = await generateV4ReadSignedUrl(gcsObjectPath);
                console.log(`[ProcessJob] Generated signed URL: ${readableUrl}`);
                
                transcription = await transcribeWithDeepgram(readableUrl);

                console.log("[ProcessJob] Transcription complete. Starting OpenAI video evaluation...");
                await prisma.job.update({ where: { id }, data: { status: 'processing-in-openai' } });
                console.log(`[ProcessJob] Using R2 URL for video evaluation: ${gcsUrl}`);
                evaluationResult = await evaluateVideo(surgeryName, additionalContext || '', gcsUrl, transcription);

            } catch (videoError) {
                console.error("[ProcessJob] OpenAI video evaluation failed. Falling back to audio-only analysis.", videoError);
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

        console.log(`Job ${id}: OpenAI evaluation complete.`);

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