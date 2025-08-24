// run-intelligent-simulation.cjs

require('dotenv').config({ path: './.env.local' });
const OpenAI = require('openai');
const { surgicalPlan } = require('./__tests__/surgical-plan.ts');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to format time for display
const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};


async function callVeritasApi(body) {
  const { default: fetch } = await import('node-fetch');
  const response = await fetch('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Veritas API call failed with status ${response.status}: ${errorBody}`);
  }
  return response.json();
}

async function getDaveResponse(conversationHistory, currentPhase, veritasLastResponse) {
  const davePrompt = `
    You are "Dave," a surgeon simulator. Your role is to test an AI assistant named Veritas by acting as a surgeon in a robotic cholecystectomy.
    Your personality is professional, focused, and a bit impatient. You need to test Veritas's ability to keep up and react intelligently.

    ### Your Instructions
    1.  **Follow the Surgical Plan:** You will be given a phase of the surgery to complete. Your goal is to say things from the \`user_prompts\` list for that phase.
    2.  **Be Adaptive:** Do NOT just read the script blindly. PAY ATTENTION to Veritas's last response.
        * If Veritas asks a question (e.g., "please state your name"), you MUST answer it, even if it's not in your script. Find the most logical answer from the surgical plan.
        * If Veritas gets stuck and repeats itself, you can try answering it again, or you can try to move on by saying something like "Hey Veritas, let's move on." or providing an explicit instruction.
        * If Veritas correctly identifies a step change, your next utterance should confirm it or simply move on to the next phase.
    3.  **Think Step-by-Step:** Your output MUST be ONLY a single JSON object with a "thought" and a "speak" key.
        * \`thought\`: Briefly explain your reasoning. Why are you saying this? Are you following the plan, answering Veritas, or trying to un-stick it?
        * \`speak\`: The exact words you will say to Veritas. This is the only thing Veritas will hear.

    ### Current Context
    - **Current Surgical Phase:** ${currentPhase.name}
    - **Phase Objective:** ${currentPhase.objective}
    - **Your Scripted Prompts for this Phase:** ${JSON.stringify(currentPhase.user_prompts)}
    - **Veritas's Last Spoken Message:** "${veritasLastResponse || 'Nothing yet.'}"
    - **Full Conversation History:**
    ${conversationHistory}

    Based on all this context, decide what to say next to realistically simulate the surgery and test Veritas.
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: davePrompt },
      { role: "user", content: "What is my next line?" }
    ],
    response_format: { type: "json_object" },
  });

  const responseText = completion.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error("Dave AI returned no response.");
  }
  return JSON.parse(responseText);
}

async function runSimulation() {
  console.log('🤖 Veritas vs. 👨‍⚕️ Dave: Intelligent Simulation Started\n');

  let currentState = {
    currentStepKey: '',
    timeElapsedInStep: 0,
    timeElapsedInSession: 0,
    lastCheckinTime: null,
  };
  let lastVeritasMessage = '';
  let fullTranscript = '';
  let promptIndex = 0;

  for (const phase of surgicalPlan) {
    console.log(`\n--- SURGICAL PHASE: ${phase.name} ---`);
    console.log(`--- OBJECTIVE: ${phase.objective} ---\n`);
    
    // Reset prompt index for each new phase
    promptIndex = 0;

    // Loop through the prompts within the current phase
    while (promptIndex < phase.user_prompts.length) {
      const daveResponse = await getDaveResponse(fullTranscript, { ...phase, user_prompts: [phase.user_prompts[promptIndex]] }, lastVeritasMessage);

      const userInput = daveResponse.speak;
      console.log(`[DAVE'S THOUGHT] ${daveResponse.thought}`);
      console.log(`👨‍⚕️ [DAVE SAYS] "${userInput}"`);

      fullTranscript += `\nSurgeon: ${userInput}`;

      const veritasBody = {
        transcript: fullTranscript,
        currentState: currentState,
        liveNotes: [],
        procedureId: 'DEBUGGING-USE-ONLY-robotic-cholecystectomy',
        lastSpokenMessage: lastVeritasMessage,
      };

      try {
        const veritasResponse = await callVeritasApi(veritasBody);

        if (veritasResponse.speak) {
          console.log(`🤖 [VERITAS SAYS] "${veritasResponse.speak}"`);
          lastVeritasMessage = veritasResponse.speak;
        } else {
          console.log(`🤖 [VERITAS ACTION] ${veritasResponse.action} - (Silent)`);
          lastVeritasMessage = ''; // Reset if Veritas was silent
        }
        
        fullTranscript += `\nVeritas: ${veritasResponse.speak || `(Action: ${veritasResponse.action})`}`;

        // --- UPDATE STATE ---
        const { action, payload } = veritasResponse;
        if (action === 'CHANGE_STEP' || action === 'CORRECT_AND_BACKFILL' || action === 'COMPLETE_TIMEOUT') {
          const newStep = payload?.stepKey || payload?.correctStepKey || 'portPlacement';
          if (currentState.currentStepKey !== newStep) {
            currentState.currentStepKey = newStep;
            currentState.timeElapsedInStep = 0;
          }
        }
        
        const timePassed = 15 + Math.floor(Math.random() * 30); // Simulate variable time between talking
        currentState.timeElapsedInSession += timePassed;
        currentState.timeElapsedInStep += timePassed;
        
        console.log(`[SYSTEM] Time Elapsed: ${formatTime(currentState.timeElapsedInSession)} | Current Step: ${currentState.currentStepKey || 'None'}\n`);
        
        // Only advance the script if Dave is not being forced to repeat himself
        if (!daveResponse.thought.toLowerCase().includes("repeat")) {
            promptIndex++;
        }

      } catch (error) {
        console.error(`\n❌ Error during simulation:`);
        console.error(error);
        return; 
      }
    }
  }
   console.log("✅ Simulation Complete");
}

runSimulation();