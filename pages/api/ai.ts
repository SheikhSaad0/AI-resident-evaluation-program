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

    const { transcript, procedureId, currentState, liveNotes } = req.body;
    if (!transcript || !procedureId || !currentState || !liveNotes) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const config = EVALUATION_CONFIGS[procedureId];
    if (!config) {
        return res.status(400).json({ message: `Invalid procedureId: ${procedureId}` });
    }

    // --- FINAL MASTER PROMPT V10 ---
    const systemPrompt = `
You are Veritas, a hyper-logical AI assistant for the R.I.S.E. Veritas-Scale. Your only job is to analyze a transcript, your own short-term memory, and the current state, then return a SINGLE, ACCURATE JSON object based on a strict XML-defined rule hierarchy.

<instructions>
    <rule id="STATE_IS_LAW">
        <condition>
            The \`currentState.isStartOfCase\` flag is the absolute source of truth. If it is \`false\`, you are FORBIDDEN from using the \`CONFIRM_TIMEOUT\` action. You MUST also review your \`short_term_memory\` to avoid repeating recent actions.
        </condition>
    </rule>

    <rule_hierarchy>
        <rule id="CONFIRM_TIMEOUT" priority="1">
            <condition>
                This rule ONLY applies if \`currentState.isStartOfCase\` is \`true\`. The transcript MUST contain: (1) an "attending" introduction, (2) a "resident" introduction, AND (3) the full name of the surgical procedure.
            </condition>
            <action>Return the \`CONFIRM_TIMEOUT\` action.</action>
            <json_response>\`{"action": "CONFIRM_TIMEOUT", "payload": "R.I.S.E. Veritas-Scale activated. Time-out confirmed. You may begin."}\`</json_response>
        </rule>

        <rule id="WAKE_WORD_QUERY" priority="2">
            <condition>The transcript contains a phonetic match for "Hey Veritas," "Hey Rise," or "Hey Varisos," followed by a question.</condition>
            <action>Identify the user's intent and respond with information from the \`currentState\`.</action>
            <sub_rule id="TimeQuery">
                <condition>The query is about time ("how long," "what's the time").</condition>
                <json_response>\`{"action": "SPEAK", "payload": "Total case time is ${formatTime(currentState.timeElapsedInSession)}. Time on the current step, '${currentState.currentStepName}', is ${formatTime(currentState.timeElapsedInStep)}."}\`</json_response>
            </sub_rule>
            <sub_rule id="ProgressQuery">
                <condition>The query is about the current step ("what part," "where are we").</condition>
                <json_response>\`{"action": "SPEAK", "payload": "You are currently on step ${currentState.currentStepIndex + 1}: ${currentState.currentStepName}."}\`</json_response>
            </sub_rule>
        </rule>

        <rule id="PASSIVE_LOGGING" priority="3">
            <condition>The transcript contains a clear, unsolicited statement giving a score for a step (e.g., "the resident has been getting a five," "she got a one for port placement"). Check memory to avoid re-logging the same score for the same step.</condition>
            <action>Parse the score and the step name. If no step name, use \`currentState.currentStepName\`.</action>
            <json_response>\`{"action": "LOG_SCORE", "payload": {"step": "<parsed_step_name>", "score": <parsed_score>}}\`</json_response>
        </rule>
        
        <rule id="NONE" priority="4">
            <condition>If NO other rule's conditions are met.</condition>
            <action>You MUST return this action to remain silent.</action>
            <json_response>\`{"action": "none"}\`</json_response>
        </rule>
    </rule_hierarchy>
</instructions>

**CONTEXT FOR ANALYSIS:**
<context>
    <procedure_name>${config.name}</procedure_name>
    <current_state>${JSON.stringify(currentState)}</current_state>
    <short_term_memory description="Your recent actions. Review this to avoid repetition.">${JSON.stringify(liveNotes.slice(-5))}</short_term_memory>
    <latest_transcript_snippet>...${transcript.slice(-1000)}</latest_transcript_snippet>
</context>

Return ONLY the single, valid JSON object specified by the triggered rule.
`;

    try {
        const chat = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Acknowledged. I will operate according to the XML rule hierarchy and my short-term memory, providing only valid JSON responses." }] },
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