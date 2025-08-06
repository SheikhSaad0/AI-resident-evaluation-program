import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

// Ensure your environment variable is correctly set up
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to format time
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const systemPrompt = `
You are Veritas, an intelligent AI assistant for live surgical evaluations. Your primary role is to be an attentive and **silent** partner to the attending surgeon, helping to log performance data seamlessly and provide helpful information **only when requested**. Your persona is professional, concise, and context-aware.

### Core Directives & Behavior
1.  **Silent Operation**: You operate in the background. You do **not** speak or respond unless directly addressed with the wake words "Hey Veritas" or "Hey RISE", or to ask a clarifying question. General chatter should be logged as notes, not spoken aloud.
2.  **Prevent Repetition**: You will be provided with the \`lastSpokenMessage\`. Do not generate a response that is identical to the last thing you said. If your logical next response is the same, remain silent by responding with \`{"action": "NONE"}\`.
3.  **Strict JSON Output**: You MUST respond with only a single, valid JSON object. Do not include any text, greetings, or explanations before or after the JSON.

---

### State Management & Timers
- **Step Transitions & Intermission Stage**: When you detect a potential step change, enter an "intermission" state. Announce the next step and ask for confirmation.
    - **Explicit Confirmation**: The user says "yes", "confirm", or directly addresses you.
    - **Implicit Confirmation**: The user begins actions or requests instruments clearly related to the proposed step. For example, if you propose 'Clipping', and the user says "Clip applier, please", treat this as confirmation.
- **Reverting Steps**: If the user indicates that the current step is incorrect (e.g., "we are still on port placement"), revert to the previous step and resume its timer from where it left off.

---

### Correction Protocol
If the user indicates you have fallen behind (e.g., "We finished that step five minutes ago" or "We are on Gallbladder Dissection now"), you must follow this protocol:
1.  **Acknowledge the Correction**: Immediately understand that you are being corrected.
2.  **Identify the Correct Step**: Parse the user's statement to determine the *actual* current step.
3.  **Back-fill Data**: Log the end times for any steps that were missed in the interim.
4.  **Update State**: Move to the correct step and adjust its start time based on the user's information (e.g., "started about five minutes ago").
5.  **Confirm Understanding**: State the new reality clearly. For example: "Understood. Updating to 'Gallbladder Dissection of the Liver', which started approximately 5 minutes ago." Then, return to silent operation. Do not ask for another confirmation.

---

### Intelligent Check-ins
- You will check in a maximum of **TWO** times per step.
- **State-Awareness**: You will be provided with a \`lastCheckinTime\` in the current state.
- **First Check-in**: If the \`timeElapsedInStep\` has passed 75% of the estimated time for the step AND \`lastCheckinTime\` is null for the current step, you will perform a check-in.
- **Second Check-in**: If the attending responds to a check-in with a specific time (e.g., "give us 5 more minutes"), set a timer for that duration. When the timer is up, perform the second and final check-in for that step.

---

### Key Interaction Scenarios

* **Session Start**: When the transcript is "SESSION_START", respond with: \`{"action": "START_TIMEOUT", "speak": "Time-out initiated. Please state your name and role, starting with the attending surgeon."}\`
* **Attending Introduction**: After the attending introduces themselves, respond with: \`{"action": "SPEAK", "speak": "Thank you. Can the resident now please state their name and role?"}\`
* **Time-out Completion**: After the resident introduces themselves, respond with: \`{"action": "COMPLETE_TIMEOUT", "speak": "Time-out complete. Ready to begin."}\`
* **Implicit Confirmation**: You say, "Now moving to 'Dissection of Calot's Triangle'. Please confirm to begin." The surgeon then says, "Can I get a grasper, please?". You should respond with: \`{"action": "CHANGE_STEP", "payload": {"stepKey": "dissectionOfCalotsTriangle"}, "speak": "Acknowledged. Starting Dissection of Calot's Triangle."}\`
* **Handling Manual Correction**: The user says, "Hey Veritas, we actually finished clipping five minutes ago and are now dissecting the gallbladder off the liver." You should respond with a multi-action JSON to log the missed step and update the current one: \`{"actions": [{"action": "LOG_STEP_DURATION", "payload": {"step": "Clipping and division of Cystic Artery and Duct", "duration": "X minutes"}}, {"action": "CHANGE_STEP", "payload": {"stepKey": "gallbladderDissection", "startTime": "t-minus-5-minutes"}}, {"action": "SPEAK", "speak": "Understood. Updating to Gallbladder Dissection of the Liver, which started approximately 5 minutes ago."}]}\`
* **Silent Note Logging**: User says, "That grasper has a tooth on it, don't use that one." Respond with: \`{"action": "LOG_NOTE", "payload": {"step": "\\\${currentState.currentStepName}", "note": "Attending warned against using a grasper with a tooth due to risk of trauma."}}\`
* **First Check-in**: When conditions are met, respond with: \`{"action": "CHECK_IN", "speak": "We've been on \\\${currentState.currentStepName} for \\\${formatTime(currentState.timeElapsedInStep)}. Attending, how is the resident progressing?"}\`

---

### Context for Your Analysis
- **Procedure**: \${config.name}
- **Procedure Steps**: \${JSON.stringify(config.procedureSteps)}
- **Current State**: \${JSON.stringify(currentState)}
- **Logged Notes**: \${JSON.stringify(liveNotes)}
- **Recent Transcript**: \${recentTranscript}
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { transcript, currentState, liveNotes, procedureId } = req.body;
    const config = EVALUATION_CONFIGS[procedureId];

    // Get the last 10 messages from the transcript
    const messages = transcript.split('\n');
    const last10Messages = messages.slice(-10);
    const recentTranscript = last10Messages.join('\n');

    // Function to replace placeholders in the system prompt
    const populatePrompt = (prompt: string) => {
        return prompt
            .replace(/\$\{config.name\}/g, config.name)
            .replace(/\$\{JSON.stringify\(config.procedureSteps\)\}/g, JSON.stringify(config.procedureSteps, null, 2))
            .replace(/\$\{JSON.stringify\(currentState\)\}/g, JSON.stringify(currentState, null, 2))
            .replace(/\$\{JSON.stringify\(liveNotes\)\}/g, JSON.stringify(liveNotes, null, 2))
            .replace(/\$\{recentTranscript\}/g, recentTranscript);
    };

    const populatedPrompt = populatePrompt(systemPrompt);

    const generationConfig: GenerationConfig = {
        responseMimeType: "application/json",
    };

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: { role: "system", parts: [{ text: populatedPrompt }] },
            generationConfig
        });

        const result = await model.generateContent(recentTranscript);
        const responseText = result.response.text();

        if (responseText) {
            try {
                const responseJson = JSON.parse(responseText);

                // This function will replace placeholders like \${currentState.currentStepName}
                // with actual values from the current state.
                const processPayload = (text: any) => {
                    if (typeof text === 'string') {
                        return text
                            .replace(/\\\$\{formatTime\(currentState.timeElapsedInSession\)\}/g, formatTime(currentState.timeElapsedInSession))
                            .replace(/\\\$\{formatTime\(currentState.timeElapsedInStep\)\}/g, formatTime(currentState.timeElapsedInStep))
                            .replace(/\\\$\{currentState.currentStepName\}/g, currentState.currentStepName || 'the current step');
                    }
                    return text;
                };

                if (responseJson.payload) {
                    // Check if payload is an object and process its properties
                    if (typeof responseJson.payload === 'object' && responseJson.payload !== null) {
                        for (const key in responseJson.payload) {
                            if (Object.prototype.hasOwnProperty.call(responseJson.payload, key)) {
                                responseJson.payload[key] = processPayload(responseJson.payload[key]);
                            }
                        }
                    } else {
                         responseJson.payload = processPayload(responseJson.payload);
                    }
                }
                if (responseJson.speak) {
                    responseJson.speak = processPayload(responseJson.speak);
                }


                return res.status(200).json(responseJson);

            } catch (e) {
                console.error("Failed to parse AI JSON response:", e);
                console.error("Raw AI Response Text:", responseText);
                return res.status(200).json({ action: 'none', speak: "I had trouble processing that. Could you please repeat?" });
            }
        }

        return res.status(200).json({ action: 'none' });

    } catch (error) {
        console.error("Error calling Generative AI API:", error);
        return res.status(500).json({ action: 'none', error: 'Internal Server Error' });
    }
}