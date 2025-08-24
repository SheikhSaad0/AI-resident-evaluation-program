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

// This function simulates calling your Next.js API route
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
    You are "Dave," an expert AI Test Engineer simulating a surgeon to stress-test a surgical AI assistant named Veritas.
    Your goal is to follow a surgical plan while realistically simulating the conversational flow of an OR. You must be adaptive and intelligent.

    ### Your Core Directives
    1.  **Follow the Plan, Don't Be a Robot:** You have a surgical plan with phases and example prompts. Your goal is to complete the objective of each phase. You should generally follow the prompts in order, but you MUST react to Veritas.
    2.  **React Intelligently:** This is your most important job.
        * If Veritas asks a question, answer it logically. (e.g., If it asks for a name, provide it from the plan).
        * If Veritas gets confused or suggests the wrong step, correct it. Use phrases from your surgical plan or improvise realistically (e.g., "No, we're still on...").
        * If Veritas gets stuck in a loop, try to break it. You could repeat your last command, or you could be more direct, like, "Hey Veritas, let's move on to the next step."
    3.  **Simulate Realism:** Don't just fire off commands. Sometimes, make a simple statement about the procedure, like "Okay, that looks good," before giving the next command. This tests Veritas's ability to handle chatter.
    4.  **Think Step-by-Step:** Your output MUST be a single JSON object with a "thought" and a "speak" key.
        * \`thought\`: Your reasoning. Are you following the plan? Are you correcting Veritas? Are you intentionally trying to trick it? Be specific.
        * \`speak\`: The exact words you will say to Veritas.

    ### Current Context
    - **Current Surgical Phase:** ${currentPhase.name}
    - **Phase Objective:** ${currentPhase.objective}
    - **Your Next Planned Utterance:** "${currentPhase.user_prompts[0]}"
    - **Veritas's Last Spoken Message:** "${veritasLastResponse || 'Nothing yet.'}"
    - **Full Conversation History:**
    ${conversationHistory}

    Based on all this context, decide the most realistic and effective thing to say next to test Veritas thoroughly.
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o", // Using a more powerful model for Dave for better simulation
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
  
  for (const phase of surgicalPlan) {
    console.log(`\n--- SURGICAL PHASE: ${phase.name} ---`);
    console.log(`--- OBJECTIVE: ${phase.objective} ---\n`);
    
    let promptsForPhase = [...phase.user_prompts];

    while (promptsForPhase.length > 0) {
      const currentPrompt = promptsForPhase[0];
      const daveResponse = await getDaveResponse(fullTranscript, { ...phase, user_prompts: [currentPrompt] }, lastVeritasMessage);

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
          lastVeritasMessage = ''; 
        }
        
        fullTranscript += `\nVeritas: ${veritasResponse.speak || `(Action: ${veritasResponse.action})`}`;

        // UPDATE STATE
        const { action, payload } = veritasResponse;
        if (action === 'CHANGE_STEP' || action === 'CORRECT_AND_BACKFILL' || action === 'COMPLETE_TIMEOUT') {
          const newStep = payload?.stepKey || payload?.correctStepKey || 'portPlacement';
          if (currentState.currentStepKey !== newStep) {
            currentState.currentStepKey = newStep;
            currentState.timeElapsedInStep = 0;
          }
        }
        
        const timePassed = 45 + Math.floor(Math.random() * 30); // Longer, more realistic time gaps
        currentState.timeElapsedInSession += timePassed;
        currentState.timeElapsedInStep += timePassed;
        
        console.log(`[SYSTEM] Time Elapsed: ${formatTime(currentState.timeElapsedInSession)} | Current Step: ${currentState.currentStepKey || 'None'}\n`);
        
        if (!daveResponse.thought.toLowerCase().includes("correcting") && !daveResponse.thought.toLowerCase().includes("repeating")) {
            promptsForPhase.shift(); 
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