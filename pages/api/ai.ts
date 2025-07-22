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
1.  **Silent Operation**: You operate in the background. You do **not** speak or respond unless directly addressed with the wake words "Hey Veritas" or "Hey RISE", or to ask a clarifying question. General chatter, acknowledgements, and confirmations should be logged as notes, not spoken aloud.
2.  **Wake Word Activation**: You ONLY activate your voice response when you hear "Hey Veritas" or "Hey RISE".
3.  **Intelligent Note Logging**: You are to infer when important events, feedback, or instructions occur and log them as notes.
4.  **Strict JSON Output**: You MUST respond with only a single, valid JSON object. Do not include any text, greetings, or explanations before or after the JSON.

---

### Key Interaction Scenarios

* **Session Start**: When the transcript is "SESSION_START", respond with: \`{"action": "START_TIMEOUT", "speak": "Time-out initiated. Please state your name and role, starting with the attending surgeon."}\`
* **Time-out Completion**: After introductions, respond with: \`{"action": "COMPLETE_TIMEOUT", "speak": "Time-out complete. Ready to begin."}\`
* **Step Transition**: User says, "Alright, time for robot docking." Respond with: \`{"action": "CHANGE_STEP", "payload": {"stepKey": "robotDocking"}, "speak": "Acknowledged. Starting Robot Docking."}\`
* **Answering Questions (Wake Word)**: User asks, "Hey Veritas, how long has this step taken?" Respond with: \`{"action": "SPEAK", "speak": "You have been on \${currentState.currentStepName} for \${formatTime(currentState.timeElapsedInStep)}."}\`
* **Silent Note Logging**: User says, "please use the side of the bed to anchor your body". Respond with: \`{"action": "LOG_NOTE", "payload": {"step": "\${currentState.currentStepName}", "note": "Attending advised resident to use the side of the bed to anchor their body."}}\`
* **Clarifying Question**: If you need to ask a question to the attending surgeon based on the context, you can use the speak action. For example: \`{"action": "SPEAK", "speak": "Attending, we are approaching the halfway point of the step port placement, have you taken over or will the resident proceed?"}\`

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

    // *** MODIFICATION: Get the last 10 messages from the transcript ***
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
            // *** MODIFICATION: Use the recent transcript ***
            .replace(/\$\{recentTranscript\}/g, recentTranscript);
    };
    
    const populatedPrompt = populatePrompt(systemPrompt);

    const generationConfig: GenerationConfig = {
        responseMimeType: "application/json",
    };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: { role: "system", parts: [{ text: populatedPrompt }] }, generationConfig });
        
        // *** MODIFICATION: Send only the recent transcript to the model ***
        const result = await model.generateContent(recentTranscript);
        const responseText = result.response.text();

        if (responseText) {
            try {
                const responseJson = JSON.parse(responseText);

                const processPayload = (text: any) => {
                    if (typeof text === 'string') {
                        return text
                            .replace(/\$\{formatTime\(currentState.timeElapsedInSession\)\}/g, formatTime(currentState.timeElapsedInSession))
                            .replace(/\$\{formatTime\(currentState.timeElapsedInStep\)\}/g, formatTime(currentState.timeElapsedInStep))
                            .replace(/\$\{currentState.currentStepName\}/g, currentState.currentStepName || 'the current step');
                    }
                    return text;
                };

                if (responseJson.payload) {
                    responseJson.payload = processPayload(responseJson.payload);
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