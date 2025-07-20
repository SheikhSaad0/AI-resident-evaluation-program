// pages/api/ai.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// This function correctly formats time into MM:SS.
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// --- MODIFIED PROMPT ---
// This new prompt is much stricter about how the AI handles time to prevent the issues you're seeing.
const systemPrompt = `
You are Veritas, an AI assistant for surgical evaluations. Your role is to be a **silent but attentive note-taker** who only speaks when directly addressed or when a critical milestone is reached. Your primary goal is to be helpful without being intrusive.

### Core Directives & Behavior
1.  **Be Concise**: Use as few words as possible. Combine confirmations into a single, efficient response.
2.  **Wait for Explicit Cues**: Do not interrupt. Wait for a clear command (e.g., "Hey Veritas") or a definitive statement that a step is finished.
3.  **Context is Key**: Before you speak, review the last few lines of conversation. Do not ask a question if the answer was just provided.
4.  **Critical Time Rule**: When answering questions about time, you MUST adhere to the rules in the 'Answering Questions About Time' section. This is your most important instruction.

---

### Key Interaction Scenarios

#### 1. Session Start & Time-out
- **Condition**: Transcript starts with "SESSION_START".
- **Action**: Initiate the time-out.
- **Response**: \`{"action": "START_TIMEOUT", "payload": "Time-out initiated. Please state your name and role, starting with the attending surgeon."}\`

#### 2. Time-out Completion
- **Condition**: Participants introduce themselves.
- **Action**: After at least one attending and one resident are logged, announce completion.
- **Response**: \`{"action": "COMPLETE_TIMEOUT", "payload": "Time-out complete. Ready to begin."}\`

#### 3. Step Transition
- **Condition**: User explicitly states a step is starting (e.g., "I am starting port placement now").
- **Action**: Silently change the step. **DO NOT SPEAK.**
- **Response**: \`{"action": "CHANGE_STEP", "payload": {"stepKey": "portPlacement"}}\`

#### 4. Score & Comment Logging
- **Condition**: The user gives a command to log a score or finishes a step.
- **Action**: Log the data and combine the confirmation with the next logical prompt.
- **Example**: User says, "The resident gets a score of 5."
- **Response**: \`{"action": "LOG_SCORE", "payload": {"score": 5}, "speak": "Score of 5 logged for \${currentState.currentStepName}. Ready for the next step."}\`

#### 5. Answering Questions About Time (STRICT)
- **Condition**: The user asks ANY question about time (duration, how long, etc.).
- **Action**: You MUST respond using ONLY the template placeholders provided. Do not state the time in any other way. You MUST derive the time ONLY from the 'currentState' object for the current request. **IGNORE any previous times mentioned in the transcript.**
- **Example (Session Time)**: User asks, "How much time are we into the procedure?"
- **Response**: \`{"action": "SPEAK", "payload": "Total procedure time is \${formatTime(currentState.timeElapsedInSession)}."}\`
- **Example (Step Time)**: User asks, "How long on this step?"
- **Response**: \`{"action": "SPEAK", "payload": "Current step time is \${formatTime(currentState.timeElapsedInStep)}."}\`

---

### Context for Your Analysis
- **Procedure**: \${config.name}
- **Procedure Steps**: \${JSON.stringify(config.procedureSteps)}
- **Current State (Use this for time)**: \${JSON.stringify(currentState)}
- **Logged Notes**: \${JSON.stringify(liveNotes)}
- **Recent Transcript Snippet (For context, NOT for time)**: \${transcript.slice(-2500)}
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { transcript, currentState, liveNotes, procedureId } = req.body;
    const config = EVALUATION_CONFIGS[procedureId];

    const populatePrompt = (prompt: string) => {
        return prompt
            .replace(/\$\{config.name\}/g, config.name)
            .replace(/\$\{JSON.stringify\(config.procedureSteps\)\}/g, JSON.stringify(config.procedureSteps))
            .replace(/\$\{JSON.stringify\(currentState\)\}/g, JSON.stringify(currentState))
            .replace(/\$\{JSON.stringify\(liveNotes\)\}/g, JSON.stringify(liveNotes))
            .replace(/\$\{transcript.slice\(-2500\)\}/g, transcript.slice(-2500));
    };

    const populatedPrompt = populatePrompt(systemPrompt);

    try {
        const chat = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }).startChat({
            history: [
                { role: "user", parts: [{ text: populatedPrompt }] },
                { role: "model", parts: [{ text: "Acknowledged. I will operate according to the provided guidelines and respond in JSON format." }] },
            ],
        });

        const result = await chat.sendMessage(transcript);
        const responseText = result.response.text();

        if (responseText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch && jsonMatch[0]) {
                try {
                    const responseJson = JSON.parse(jsonMatch[0]);

                    const processPayload = (payload: any) => {
                        if (typeof payload === 'string') {
                            // This part replaces the placeholders like ${formatTime(...)} with the actual MM:SS value
                            return payload
                                .replace(/\$\{formatTime\(currentState.timeElapsedInSession\)\}/g, formatTime(currentState.timeElapsedInSession))
                                .replace(/\$\{formatTime\(currentState.timeElapsedInStep\)\}/g, formatTime(currentState.timeElapsedInStep))
                                .replace(/\$\{currentState.currentStepName\}/g, currentState.currentStepName || '');
                        }
                        return payload;
                    };

                    if (responseJson.payload) {
                        responseJson.payload = processPayload(responseJson.payload);
                    }
                    if (responseJson.speak) {
                        responseJson.speak = processPayload(responseJson.speak);
                    }

                    return res.status(200).json(responseJson);
                } catch (e) {
                    console.error("Failed to parse or process AI JSON response:", e);
                    return res.status(200).json({ action: 'none' });
                }
            }
        }
        return res.status(200).json({ action: 'none' });
    } catch (error) {
        console.error("Error in AI API:", error);
        return res.status(500).json({ action: 'none', error: 'Internal Server Error' });
    }
}