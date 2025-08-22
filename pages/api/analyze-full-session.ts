import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';
import { getPrismaClient } from '../../lib/prisma';
import { uploadFileToR2, getPublicUrl } from '../../lib/r2';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export const config = {
    api: {
        bodyParser: false,
    },
};

async function getOpenAIResponse(prompt: string) {
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
        throw new Error("No response from OpenAI model.");
    }
    
    // More robust JSON parsing
    const jsonString = responseText.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonString) {
        throw new Error("Invalid JSON response from AI model.");
    }
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
    const prisma = getPrismaClient(req);

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
        await uploadFileToR2(audioFile.filepath, destination);
        fs.unlinkSync(audioFile.filepath);

        const stepKeysForJson = config.procedureSteps.map(s => `"${s.key}": { "score": <number between 0 and 5>, "time": "<string>", "comments": "<string>" }`).join(',\n    ');

        const finalPrompt = `
You are an expert surgical education analyst. Your task is to provide a detailed, constructive evaluation of a resident's performance based on the provided transcript and live notes for the **${surgeryName}** procedure.

**CONTEXT:**
- **Procedure:** ${surgeryName}
- **Resident ID:** ${residentId}
- **Live AI Notes (for context):** ${liveNotes || 'No live notes were recorded.'}
- **Transcript:** A full transcript of the procedure is provided below.

**SCORING SCALE (R.I.S.E Veritas Scale):**

**5 – Full autonomy**
Resident completed the step independently, with minimal or no verbal feedback. May include brief confirmation or non-corrective commentary from the attending.

**4 – Verbal coaching only**
Resident completed the full step with moderate to heavy **verbal** instruction.
✅ Extensive coaching is fine — as long as **the attending did not perform the step or intervene physically in a corrective way**.

**3 – Physical assistance or redo required**
Resident completed >50% of the step, but:
- Required physical help to correct technique (e.g., attending adjusted angle, guided a needle, loaded a clip)
- Attending gave explicit redo instructions with partial physical involvement
- Resident performed the task incorrectly at first and attending physically intervened to fix it

**2 – Shared or corrected performance**
Attending had to co-perform the step due to error or inefficiency:
- Resident could not complete a subtask without attending taking over
- Attending re-did a portion due to technical error

**1 – Incomplete or unsafe**
Resident failed to perform the step; attending took over for safety or completion

**0 – Step not done / no info**

---

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
- Do not make up information about what the attending says, avoid direct quotes, justevaluate each step effectively, if there was no attending comment for that step, mention that.
- Be as accurate as you can, when the transcript is silent, assume that the surgeons are operating
- When an attending is talking, without mention of them taking over or verbal cues that they did take over, assume the resident is performing the procedure as they are being the ones evaluated, by default they are doing the surgery.
- Listen in to the random comments made by the attending throughout the case and take note of those comments to be later used in the additional comments/overall score section of the finished evaluation.
- unless the attending EXPLICITLY states that they are taking over, assume the resident is in full control
- know the difference between the attending speaking / guiding and taking over, if the attending is speaking and acting like he is doing the procedure, but the resident is doing the same, assume the resident is operating.
- Take into account random mishaps or accidents that may happen in the OR
- use context clues to differentiate coaching and acting from the attending, things like "let me scrub in now" or "give me that" are some examples
- keep into account that speak 0 and 1 labels may not be very accurate in the transcript
- keep in mind, even if the residents makes mistakes or does something wrong and is corrected by the attending verbally, under all circumstances that the attending does not physically have to take over or do the step, the resident is awarded at minimum a score of 4 for that step, this is due to the fact they only had verbal coaching and no interference from the attending
- we can define a 5 as done without intensive coaching (This can be defined as constant direction and comments from the attending for a step, a few comments before he does the step would generally not count), the attending may speak but overall the resident probably would have been fine if the attending did not make any comments at all, this is up to you to evaluate based on context

**Provide Overall Assessment:**
- **\`caseDifficulty\`**: (Number 1-3) Rate the case difficulty based on the available information.
- **\`additionalComments\`**: (String) Provide a concise summary of the resident's overall performance, include key details to their performance and ideas for improvement.

**JSON OUTPUT FORMAT:** You MUST return ONLY a single, valid JSON object matching this exact structure. Do not include any other text or markdown formatting.

\`\`\`json
{
  "caseDifficulty": <number>,
  "additionalComments": "<string>",
  ${stepKeysForJson}
}
\`\`\`

**TRANSCRIPT FOR ANALYSIS:**
---
${fullTranscript}
---
`;
        const evaluationData = await getOpenAIResponse(finalPrompt);
        const resident = await prisma.resident.findUnique({ where: { id: residentId } });

        const finalResult = {
            ...evaluationData,
            transcription: fullTranscript,
            liveNotes: liveNotes,
            surgery: surgeryName,
            procedureSteps: config.procedureSteps,
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