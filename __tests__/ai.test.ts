// __tests__/ai.test.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/ai';
import { testScenarios } from './test-scenarios';
import OpenAI from 'openai';

// This is the key: We mock the entire 'openai' module.
// This ensures that any file that imports from 'openai' will get our fake version.
jest.mock('openai');

// We create a typed mock of the OpenAI class.
const mockedOpenAI = jest.mocked(OpenAI);

describe('Veritas AI Live Mode - Full Surgical Simulation', () => {

  let mockCreate: jest.Mock;
  
  // This object will hold the evolving state of our simulated surgery.
  let mockCurrentState: any = {
    currentStepKey: '',
    timeElapsedInStep: 0,
    timeElapsedInSession: 0,
    lastCheckinTime: null,
  };
  let lastSpokenMessage = '';
  let fullTranscript = '';

  beforeEach(() => {
    // Before each test, reset the mock to a clean state.
    mockCreate = jest.fn();
    mockedOpenAI.mockImplementation(() => {
      // This is the fake implementation of the `new OpenAI()` constructor.
      // When the handler calls `new OpenAI()`, it receives this object.
      return {
        chat: {
          completions: {
            create: mockCreate, // The `create` method is our mock function.
          },
        },
      } as any;
    });
  });

  // Using `test.each` to run scenarios sequentially.
  test.each(testScenarios)('Scenario: $description', async (scenario) => {
    
    // Configure our mock `create` function to return the expected output for this specific test.
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(scenario.expectedOutput),
          },
        },
      ],
    });

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

    await handler(req, res);

    // --- VERIFICATION ---

    expect(res._getStatusCode()).toBe(200);
    const responseJson = JSON.parse(res._getData());
    expect(responseJson).toEqual(scenario.expectedOutput);

    // --- STATE UPDATE FOR THE NEXT TEST ---
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