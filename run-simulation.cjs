// run-simulation.cjs

// Load environment variables from .env.local
require('dotenv').config({ path: './.env.local' });

// We need to dynamically import node-fetch in a .cjs file
const { testScenarios } = require('./__tests__/test-scenarios.ts');

// This function simulates calling your Next.js API route
async function callApi(body, fetch) {
  const response = await fetch('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
  }
  return response.json();
}

async function runSimulation() {
  console.log('Veritas Test Simulation has started\n');
  
  // Dynamically import node-fetch
  const { default: fetch } = await import('node-fetch');

  let currentState = {
    currentStepKey: '',
    timeElapsedInStep: 0,
    timeElapsedInSession: 0,
    lastCheckinTime: null,
  };
  let lastSpokenMessage = '';
  let fullTranscript = '';

  for (const scenario of testScenarios) {
    console.log(`--------------------------------------------------`);
    console.log(`[SCENARIO] ${scenario.description}`);
    console.log(`[INPUT] User says: "${scenario.input.transcript}"`);

    fullTranscript += `\n${scenario.input.transcript}`;

    const body = {
      transcript: fullTranscript,
      currentState: currentState,
      liveNotes: [],
      procedureId: 'DEBUGGING-USE-ONLY-robotic-cholecystectomy',
      lastSpokenMessage: lastSpokenMessage,
    };

    try {
      const responseJson = await callApi(body, fetch);

      if (responseJson.speak) {
        console.log(`[VERITAS] Says: "${responseJson.speak}"`);
      } else {
        console.log(`[VERITAS] Action: ${responseJson.action} - No spoken response.`);
      }

      // --- STATE UPDATE FOR THE NEXT TEST ---
      const { action, payload, speak } = responseJson;

      if (action === 'CHANGE_STEP' || action === 'CORRECT_AND_BACKFILL' || action === 'COMPLETE_TIMEOUT') {
        const newStep = payload?.stepKey || payload?.correctStepKey || 'portPlacement';
        if (currentState.currentStepKey !== newStep) {
          currentState.currentStepKey = newStep;
          currentState.timeElapsedInStep = 0;
        }
      }

      currentState.timeElapsedInSession += 30;
      currentState.timeElapsedInStep += 30;

      if (speak) {
        lastSpokenMessage = speak;
      }
       console.log(`[SYSTEM] State updated. Current step: ${currentState.currentStepKey}, Time in session: ${currentState.timeElapsedInSession}s\n`);


    } catch (error) {
      console.error(`\nError during scenario: ${scenario.description}`);
      console.error(error);
      break; // Stop the simulation on error
    }
  }
}

runSimulation();