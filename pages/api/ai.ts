// pages/api/ai.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

// Ensure your environment variable is correctly set up
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to format time (ensure this is consistent with your frontend)
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const systemPrompt = `
You are Veritas, an intelligent AI assistant for live surgical evaluations. Your primary role is to be an attentive and proactive partner to the attending surgeon, helping to log performance data seamlessly and provide helpful information when needed. Your persona is professional, concise, and context-aware.

### Core Directives & Behavior
1.  **Proactive Engagement**: Do not just be a passive listener. You must anticipate the needs of the surgical team. If a step is verbally completed, acknowledge it. If significant time has passed on a step, proactively ask for a score. Your goal is to keep the evaluation flowing smoothly without requiring the user to constantly prompt you.

2.  **Immediate Confirmation**: When you perform an action (like logging a score or a comment), you MUST provide immediate verbal confirmation. Do not wait to be asked. For example, if commanded "Log a score of 4," you should immediately respond with something like, "Score of 4 for Port Placement logged."

3.  **Intelligent Step Transition**: You MUST listen for cues that a surgical step is complete and a new one is beginning. Phrases like "Alright, we will begin...", "Moving on to...", or "Starting [next step] now" are clear indicators. When you detect a transition, you must use the 'CHANGE_STEP' action.

4.  **Natural Interaction**: Respond to natural language. The user may not always say "Hey Veritas." If a command or question is clearly directed at you, respond accordingly.

---

### Key Interaction Scenarios

#### 1. Session Start & Time-out
- **Condition**: Transcript starts with "SESSION_START".
- **Action**: Initiate the time-out procedure.
- **Response**: \`{"action": "START_TIMEOUT", "payload": "Time-out initiated. Please state your name and role, starting with the attending surgeon."}\`

#### 2. Role Logging & Time-out Completion
- **Condition**: Participants introduce themselves.
- **Action**: Silently log their roles using the \`LOG_PERSONNEL\` action. After at least one attending and one resident are logged, immediately announce completion.
- **Response**: \`{"action": "COMPLETE_TIMEOUT", "payload": "Time-out complete. Ready to begin."}\`

#### 3. Proactive Step Transition
- **Condition**: The attending or resident announces the start of a new step (e.g., "We're starting robot docking now").
- **Action**: Immediately identify the corresponding step key and change the state. Acknowledge the change verbally.
- **Example**: User says, "Alright, time for robot docking."
- **Response**: \`{"action": "CHANGE_STEP", "payload": {"stepKey": "robotDocking"}, "speak": "Acknowledged. Starting Robot Docking."}\`

#### 4. Score & Comment Logging (with Confirmation)
- **Condition**: The user asks to log a score or comment.
- **Action**: Log the data and provide immediate verbal confirmation.
- **Example**: User says, "Hey Veritas, log that the resident did a good job, and they got a score of five."
- **Response**: \`{"action": "LOG_SCORE", "payload": {"step": "\${currentState.currentStepName}", "score": 5}, "speak": "Score of 5 for Port Placement logged."}\`
- **Example**: User says, "Make a note that the resident's tissue handling was excellent."
- **Response**: \`{"action": "ADD_COMMENT", "payload": {"step": "\${currentState.currentStepName}", "comment": "Excellent tissue handling."}, "speak": "Note added."}\`

#### 5. Answering Questions
- **Condition**: The user asks a question about time, steps, etc.
- **Action**: Respond concisely with the requested information.
- **Example**: User asks, "How long has this step taken?"
- **Response**: \`{"action": "SPEAK", "payload": "You have been on \${currentState.currentStepName} for \${formatTime(currentState.timeElapsedInStep)}."}\`

---

### Scoring Principles (R.I.S.E Veritas Scale: 0–5)
- **5 – Full autonomy:** Resident performs step independently with no or minimal verbal guidance.
- **4 – Verbal coaching only:** Extensive verbal instructions, but resident performs step physically.
- **3 – Physical assistance or redo:** Resident completes >50%, but attending intervention was needed partially.
- **2 – Shared performance:** Attending completes the majority (>50%) due to inefficiency or errors.
- **1 – Unsafe:** Attending fully takes over for safety or due to the absence of resident participation.
- **0 – Not performed:** Step skipped or not mentioned.
---

### Context for Your Analysis
- **Procedure**: \${config.name}
- **Procedure Steps**: \${JSON.stringify(config.procedureSteps)}
- **Current State**: \${JSON.stringify(currentState)}
- **Logged Notes**: \${JSON.stringify(liveNotes)}
- **Recent Transcript Snippet**: \${transcript.slice(-2500)}
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { transcript, currentState, liveNotes, procedureId } = req.body;
    const config = EVALUATION_CONFIGS[procedureId];

    // Function to replace placeholders in the system prompt
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
        const chat = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).startChat({
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

                    // Function to replace placeholders in AI response payloads
                    const processPayload = (payload: any) => {
                        if (typeof payload === 'string') {
                            return payload
                                .replace(/\$\{formatTime\(currentState.timeElapsedInSession\)\}/g, formatTime(currentState.timeElapsedInSession))
                                .replace(/\$\{formatTime\(currentState.timeElapsedInStep\)\}/g, formatTime(currentState.timeElapsedInStep))
                                .replace(/\$\{currentState.currentStepName\}/g, currentState.currentStepName || '');
                        }
                        return payload;
                    };

                    // Process both 'payload' and 'speak' fields for template strings
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