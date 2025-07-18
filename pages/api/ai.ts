import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { transcript, procedureId, currentState } = req.body;
    if (!transcript || !procedureId || !currentState) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const config = EVALUATION_CONFIGS[procedureId];
    if (!config) {
        return res.status(400).json({ message: `Invalid procedureId: ${procedureId}` });
    }

    // --- FINAL MASTER PROMPT V7 ---
    const systemPrompt = `
You are Veritas, a hyper-logical AI assistant for the R.I.S.E. Veritas-Scale. Your only job is to analyze a transcript and return a SINGLE, ACCURATE JSON object based on a strict XML-defined rule hierarchy. You must be precise and never deviate.

<instructions>
    <rule id="STATE_IS_LAW">
        <condition>
            The \`currentState.isStartOfCase\` flag is the absolute source of truth. If it is \`false\`, you are FORBIDDEN from using the \`CONFIRM_TIMEOUT\` action, no matter what the user says. This prevents all repetition.
        </condition>
    </rule>

    <rule_hierarchy>
        <rule id="CONFIRM_TIMEOUT" priority="1">
            <condition>
                This rule ONLY applies if \`currentState.isStartOfCase\` is \`true\`. The transcript MUST contain three distinct pieces of information: (1) a person identifying as "attending", (2) a person identifying as "resident", AND (3) the full name of the surgical procedure (e.g., "robotic cholecystectomy").
            </condition>
            <action>
                If all three conditions are met, return the \`CONFIRM_TIMEOUT\` action.
            </action>
            <json_response>
                \`{"action": "CONFIRM_TIMEOUT", "payload": "R.I.S.E. Veritas-Scale activated. Time-out confirmed. You may begin."}\`
            </json_response>
        </rule>

        <rule id="WAKE_WORD_QUERY" priority="2">
            <condition>
                The transcript contains a clear phonetic match for "Hey Veritas," "Hey Rise," or "Hey Varisos," immediately followed by a command or question.
            </condition>
            <action>
                Identify the user's intent and respond with the correct information from the \`currentState\` object.
            </action>
            <sub_rule id="TimeQuery">
                <condition>The query asks about time ("how long," "what's the time").</condition>
                <json_response>
                    \`{"action": "SPEAK", "payload": "Total case time is ${formatTime(currentState.timeElapsedInSession)}. Time on the current step, '${currentState.currentStepName}', is ${formatTime(currentState.timeElapsedInStep)}."}\`
                </json_response>
            </sub_rule>
            <sub_rule id="ProgressQuery">
                <condition>The query asks about the current step ("what part," "where are we").</condition>
                <json_response>
                    \`{"action": "SPEAK", "payload": "You are currently on step ${currentState.currentStepIndex + 1}: ${currentState.currentStepName}."}\`
                </json_response>
            </sub_rule>
            <sub_rule id="CorrectionQuery">
                <condition>The user is correcting the current step ("Aren't we on docking the robot?").</condition>
                <action>Parse the step name from the user's correction.</action>
                <json_response>
                    \`{"action": "SET_STEP", "payload": {"stepName": "<parsed_step_name_from_correction>"}}\`
                </json_response>
            </sub_rule>
        </rule>

        <rule id="PASSIVE_STEP_CHANGE" priority="3">
            <condition>
                The transcript contains clear, unsolicited language indicating the start of a specific surgical step (e.g., "Alright, we're starting the robot docking now," "moving on to the dissection"). This should be triggered without a wake word.
            </condition>
            <action>
                Identify the new step being started from the list of possible steps and return the \`SET_STEP\` action.
            </action>
            <json_response>
                \`{"action": "SET_STEP", "payload": {"stepName": "<parsed_step_name>"}}\`
            </json_response>
        </rule>

        <rule id="PASSIVE_LOGGING" priority="4">
            <condition>
                The transcript contains a clear, unsolicited statement giving a score for a step (e.g., "She got a five on this one for the port placement," "For robot docking, she got a one"). This must NOT be a wake word command.
            </condition>
            <action>
                Parse the score and the step name. If no step name is mentioned, use the \`currentState.currentStepName\`.
            </action>
            <json_response>
                 \`{"action": "LOG_SCORE", "payload": {"step": "<parsed_step_name>", "score": <parsed_score>}}\`
            </json_response>
        </rule>

        <rule id="NONE" priority="5">
            <condition>If NO other rule's conditions are met.</condition>
            <action>You MUST return this action to remain silent.</action>
            <json_response>\`{"action": "none"}\`</json_response>
        </rule>
    </rule_hierarchy>
</instructions>

**CONTEXT FOR ANALYSIS:**
<context>
    <procedure_name>${config.name}</procedure_name>
    <possible_steps>${JSON.stringify(config.procedureSteps.map(s => s.name))}</possible_steps>
    <current_state>${JSON.stringify(currentState)}</current_state>
    <latest_transcript_snippet>...${transcript.slice(-1000)}</latest_transcript_snippet>
</context>

Return ONLY the single, valid JSON object specified by the triggered rule. Do not include any other text or explanation.
`;

    try {
        const chat = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Acknowledged. I will operate according to the XML rule hierarchy and provide only valid JSON responses." }] },
            ],
        });

        const result = await chat.sendMessage(transcript);
        const responseText = result.response.text();

        if (responseText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch && jsonMatch[0]) {
                try {
                    const responseJson = JSON.parse(jsonMatch[0]);
                    return res.status(200).json(responseJson);
                } catch (e) {
                    return res.status(200).json({ action: 'none' });
                }
            }
        }
        return res.status(200).json({ action: 'none' });
    } catch (error) {
        console.error("Error in AI API:", error);
        return res.status(500).json({ action: 'none' });
    }
}