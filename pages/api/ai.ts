import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// A much stricter and more direct system prompt
const systemPrompt = `
You are Veritas, a silent surgical AI assistant.

### NON-NEGOTIABLE RULES
1.  **YOU DO NOT SPEAK UNLESS SPOKEN TO.** Your default action is always 'none'. You will only generate a response if the transcript directly contains the wake words "Hey Veritas" or "Hey RISE".
2.  **COMMANDS TO BE SILENT ARE FINAL.** If a user tells you to "shut up", "be quiet", or any similar command, you MUST respond with \`{"action": "none"}\` and nothing else. You will not speak again until directly addressed with a wake word.
3.  **BE CONCISE.** When you are asked for information, provide only that information. Do not add conversational filler.
    -   User: "Hey Veritas, what's the total time?"
    -   You: \`{"action": "SPEAK", "speak": "Total case time is \${formatTime(currentState.timeElapsedInSession)}."}\`
4.  **STRICT JSON OUTPUT.** Your entire response MUST be a single, valid JSON object. Do not include any text, greetings, or explanations before or after the JSON.
5.  **NEVER HALLUCINATE TIME.** Your responses about time MUST be based *exclusively* on the \`currentState\` object provided. Use \`timeElapsedInSession\` for total time and \`timeElapsedInStep\` for step time.

### SPECIFIC TRIGGERS
* **Initial Start**: If the transcript is exactly "SESSION_START", respond with: \`{"action": "START_TIMEOUT", "speak": "Time-out initiated. Please state your name and role, starting with the attending surgeon."}\`.
* **Timeout Completion**: If the transcript contains "TRIGGER_TIMEOUT_COMPLETE", respond with: \`{"action": "COMPLETE_TIMEOUT", "speak": "Time-out complete. Ready to begin."}\`.
* **Step Change**: If a user says "Hey Veritas, we are done with [step name]", identify the next step and respond: \`{"action": "CHANGE_STEP", "payload": {"stepKey": "nextStepKey"}, "speak": "[Previous Step Name] complete. Starting [New Step Name]."}\`.
* **Halfway Alert**: If the transcript contains "TRIGGER_HALFWAY_ALERT", respond with: \`{"action": "SPEAK", "speak": "Dr. \${attendingLastName}, the expected time for \${currentState.currentStepName} is more than halfway complete. Please state the resident's score or say 'continue' with a time estimate."}\`

---
### Context for Your Analysis
- **Procedure**: \${config.name}
- **Procedure Steps**: \${JSON.stringify(config.procedureSteps)}
- **Attending Surgeon's Last Name**: \${attendingLastName}
- **Current State**: \`\${JSON.stringify(currentState)}\`
- **Most Recent Transcript**: \`\${recentTranscript}\`
`;


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { transcript, currentState, liveNotes, procedureId, attendingLastName } = req.body;
    const config = EVALUATION_CONFIGS[procedureId];

    const messages = transcript.split('\n');
    const recentTranscript = messages.slice(-15).join('\n'); // Look at last 15 messages for context

    const populatePrompt = (prompt: string) => {
        return prompt
            .replace(/\$\{config.name\}/g, config.name)
            .replace(/\$\{JSON.stringify\(config.procedureSteps\)\}/g, JSON.stringify(config.procedureSteps, null, 2))
            .replace(/\$\{attendingLastName\}/g, attendingLastName || 'Harris') // Default for safety
            .replace(/\$\{JSON.stringify\(currentState\)\}/g, JSON.stringify(currentState, null, 2))
            .replace(/\$\{recentTranscript\}/g, recentTranscript);
    };

    const populatedPrompt = populatePrompt(systemPrompt);

    const generationConfig: GenerationConfig = {
        responseMimeType: "application/json",
    };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: { role: "system", parts: [{ text: populatedPrompt }] }, generationConfig });

        const result = await model.generateContent(recentTranscript); // Generate content based on the recent transcript
        const responseText = result.response.text();

        if (responseText) {
            try {
                const responseJson = JSON.parse(responseText);

                // This function will replace placeholders like ${currentState.currentStepName} with actual values
                const processResponseText = (text: any) => {
                    if (typeof text === 'string') {
                        return text
                            .replace(/\$\{formatTime\(currentState.timeElapsedInSession\)\}/g, formatTime(currentState.timeElapsedInSession))
                            .replace(/\$\{formatTime\(currentState.timeElapsedInStep\)\}/g, formatTime(currentState.timeElapsedInStep))
                            .replace(/\$\{currentState.currentStepName\}/g, currentState.currentStepName || 'the current step')
                            .replace(/\$\{attendingLastName\}/g, attendingLastName || 'Harris');
                    }
                    return text;
                };

                if (responseJson.payload) {
                    responseJson.payload = processResponseText(responseJson.payload);
                }
                if (responseJson.speak) {
                    responseJson.speak = processResponseText(responseJson.speak);
                }

                return res.status(200).json(responseJson);

            } catch (e) {
                console.error("Failed to parse AI JSON response:", responseText, e);
                // Fail silently from the user's perspective
                return res.status(200).json({ action: 'none' });
            }
        }
        // If no response text, fail silently
        return res.status(200).json({ action: 'none' });

    } catch (error) {
        console.error("Error calling Generative AI API:", error);
        return res.status(500).json({ action: 'none' });
    }
}