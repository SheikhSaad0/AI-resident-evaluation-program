// __tests__/ai.test.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/ai'; // The API handler we're testing
import { testScenarios } from './test-scenarios';
import OpenAI from 'openai';

// This line tells Jest to find the 'openai' module and replace it with our mock.
// It must be at the top level of the module.
jest.mock('openai');

// Create a typed mock of the OpenAI class. This gives us type safety.
const mockedOpenAI = jest.mocked(OpenAI);

describe('Veritas AI Live Mode - Automated Test Suite', () => {

  // We'll store a reference to the mock `create` function here
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Before each test, reset the mock to a clean state
    mockCreate = jest.fn();
    mockedOpenAI.mockImplementation(() => {
      // This is the fake implementation of the OpenAI class.
      // When `new OpenAI()` is called in our handler, it will return this object.
      return {
        chat: {
          completions: {
            create: mockCreate, // The `create` method will be our jest mock function
          },
        },
      } as any;
    });
  });

  // Loop through all scenarios and create a test for each one
  testScenarios.forEach((scenario) => {
    it(`Scenario: ${scenario.description}`, async () => {
      
      // For this specific test, we tell our mock `create` function
      // to return the expected output from the scenario.
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(scenario.expectedOutput),
            },
          },
        ],
      });

      // Create mock request and response objects to simulate an API call
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          transcript: scenario.input.transcript,
          currentState: scenario.input.currentState,
          liveNotes: scenario.input.liveNotes || [],
          procedureId: scenario.input.procedureId || 'DEBUGGING-USE-ONLY-robotic-cholecystectomy',
          lastSpokenMessage: scenario.input.lastSpokenMessage || '',
        },
      });

      // Execute the handler with our mocked objects
      await handler(req, res);

      // --- VERIFICATION ---

      // 1. Check that the handler returned a success (200) status code
      expect(res._getStatusCode()).toBe(200);
      
      // 2. Parse the JSON response from the handler
      const responseJson = JSON.parse(res._getData());
      
      // 3. The most important check: Did the handler return the exact JSON we expected?
      expect(responseJson).toEqual(scenario.expectedOutput);

      // 4. Verify that our mock AI `create` function was called exactly once
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });
});