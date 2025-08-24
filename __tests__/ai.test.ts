// __tests__/ai.test.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/ai';
import { testScenarios } from './test-scenarios';

// Increase the timeout for each test to 30 seconds to allow for API calls
jest.setTimeout(30000);

describe('Veritas AI Live Mode - Full Surgical Simulation', () => {
  // This object will hold the evolving state of our simulated surgery.
  let mockCurrentState: any = {
    currentStepKey: '',
    timeElapsedInStep: 0,
    timeElapsedInSession: 0,
    lastCheckinTime: null,
  };
  let lastSpokenMessage = '';
  let fullTranscript = '';

  // Using `test.each` to run scenarios sequentially.
  // This simulates a real, flowing conversation.
  test.each(testScenarios)('Scenario: $description', async (scenario) => {
    fullTranscript += `\n${scenario.input.transcript}`;

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        transcript: fullTranscript,
        currentState: mockCurrentState,
        liveNotes: [],
        procedureId: 'DEBUGGING-USE-ONLY-robotic-cholecystectomy',
        lastSpokenMessage: lastSpokenMessage,
      },
    });

    // This calls your actual API handler, which will make a real call to OpenAI
    await handler(req, res);

    // --- VERIFICATION ---
    // The test now checks if the REAL AI response matches your expected output.
    expect(res._getStatusCode()).toBe(200);
    const responseJson = JSON.parse(res._getData());
    expect(responseJson).toEqual(scenario.expectedOutput);

    // --- STATE UPDATE FOR THE NEXT TEST ---
    // This part simulates the frontend updating its state based on the AI's response.
    const { action, payload, speak } = responseJson;

    if (action === 'CHANGE_STEP' || action === 'CORRECT_AND_BACKFILL' || action === 'COMPLETE_TIMEOUT') {
      const newStep = payload?.stepKey || payload?.correctStepKey || 'portPlacement'; // Default to first step after timeout
      if (mockCurrentState.currentStepKey !== newStep) {
        mockCurrentState.currentStepKey = newStep;
        mockCurrentState.timeElapsedInStep = 0;
      }
    }

    // Simulate time passing between interactions
    mockCurrentState.timeElapsedInSession += 30;
    mockCurrentState.timeElapsedInStep += 30;

    if (speak) {
      lastSpokenMessage = speak;
    }
  });
});