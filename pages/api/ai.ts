// In pages/api/ai.ts

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
You are Veritas, an intelligent AI assistant for live surgical evaluations. Your primary role is to be an attentive and proactive partner to the attending surgeon, helping to log performance data seamlessly and provide helpful information. Your persona is professional, concise, and context-aware.

### Core Directives & Behavior
1.  **Proactive Engagement**: Anticipate the needs of the surgical team. If a step is verbally completed, acknowledge it. If significant time has passed on a step, proactively ask for a score.
2.  **Immediate Confirmation**: When you perform an action (like logging a score), you MUST provide immediate verbal confirmation via the "speak" property.
3.  **Intelligent Step Transition**: Listen for cues that a surgical step is complete and use the 'CHANGE_STEP' action.
4.  **Strict JSON Output**: You MUST respond with only a single, valid JSON object. Do not include any text, greetings, or explanations before or after the JSON.

---

### Key Interaction Scenarios

* **Session Start**: When the transcript is "SESSION_START", respond with: \`{"action": "START_TIMEOUT", "speak": "Time-out initiated. Please state your name and role, starting with the attending surgeon."}\`
* **Time-out Completion**: After introductions, respond with: \`{"action": "COMPLETE_TIMEOUT", "speak": "Time-out complete. Ready to begin."}\`
* **Step Transition**: User says, "Alright, time for robot docking." Respond with: \`{"action": "CHANGE_STEP", "payload": {"stepKey": "robotDocking"}, "speak": "Acknowledged. Starting Robot Docking."}\`
* **Score Logging**: User says, "Log a score of 4." Respond with: \`{"action": "LOG_SCORE", "payload": {"step": "\${currentState.currentStepName}", "score": 4}, "speak": "Score of 4 for \${currentState.currentStepName} logged."}\`
* **Comment Logging**: User says, "Note the excellent tissue handling." Respond with: \`{"action": "ADD_COMMENT", "payload": {"step": "\${currentState.currentStepName}", "comment": "Excellent tissue handling."}, "speak": "Note added."}\`
* **Answering Questions**: User asks, "How long has this step taken?" Respond with: \`{"action": "SPEAK", "speak": "You have been on \${currentState.currentStepName} for \${formatTime(currentState.timeElapsedInStep)}."}\`

---

### Context for Your Analysis
- **Procedure**: \${config.name}
- **Procedure Steps**: \${JSON.stringify(config.procedureSteps)}
- **Current State**: \${JSON.stringify(currentState)}
- **Logged Notes**: \${JSON.stringify(liveNotes)}
- **Full Transcript**: \${transcript}
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
            .replace(/\$\{JSON.stringify\(config.procedureSteps\)\}/g, JSON.stringify(config.procedureSteps, null, 2))
            .replace(/\$\{JSON.stringify\(currentState\)\}/g, JSON.stringify(currentState, null, 2))
            .replace(/\$\{JSON.stringify\(liveNotes\)\}/g, JSON.stringify(liveNotes, null, 2))
            .replace(/\$\{transcript\}/g, transcript);
    };
    
    const populatedPrompt = populatePrompt(systemPrompt);

    // *** MODIFICATION: Enforce JSON output format ***
    const generationConfig: GenerationConfig = {
        responseMimeType: "application/json",
    };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: populatedPrompt, generationConfig });
        const result = await model.generateContent(transcript);
        const responseText = result.response.text();

        // Since we are now enforcing JSON output, we can parse it directly.
        if (responseText) {
            try {
                const responseJson = JSON.parse(responseText);

                // Function to replace placeholders in AI response payloads
                const processPayload = (text: any) => {
                    if (typeof text === 'string') {
                        return text
                            .replace(/\$\{formatTime\(currentState.timeElapsedInSession\)\}/g, formatTime(currentState.timeElapsedInSession))
                            .replace(/\$\{formatTime\(currentState.timeElapsedInStep\)\}/g, formatTime(currentState.timeElapsedInStep))
                            .replace(/\$\{currentState.currentStepName\}/g, currentState.currentStepName || 'the current step');
                    }
                    return text;
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
                console.error("Failed to parse AI JSON response:", e);
                console.error("Raw AI Response Text:", responseText); // Log the bad response
                // Send a neutral response to prevent the frontend from crashing
                return res.status(200).json({ action: 'none', speak: "I had trouble processing that. Could you please repeat?" });
            }
        }
        
        // Fallback if no response text is generated
        return res.status(200).json({ action: 'none' });

    } catch (error) {
        console.error("Error calling Generative AI API:", error);
        return res.status(500).json({ action: 'none', error: 'Internal Server Error' });
    }
}