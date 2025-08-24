// __tests__/test-scenarios.ts

/**
 * Defines the shape of the AI's current state for consistent testing.
 */
interface ICurrentState {
    currentStepKey: string;
    timeElapsedInStep: number;
    timeElapsedInSession: number;
    lastCheckinTime: number | null;
    [key: string]: any; // Allow other properties
}

/**
 * Defines the structure for a single test scenario.
 */
interface ITestScenario {
    description: string;
    input: {
        transcript: string;
        currentState: ICurrentState;
        lastSpokenMessage?: string;
        liveNotes?: any[];
        procedureId?: string;
    };
    expectedOutput: {
        action: string;
        payload?: any;
        speak?: string;
    };
}

// A reusable mock state for the beginning of the procedure.
const initialMockState = {
    timeElapsedInStep: 0,
    timeElapsedInSession: 0,
    lastCheckinTime: null,
};

export const testScenarios: ITestScenario[] = [
    // 1. Session Start
    {
        description: "[Time-Out] Should correctly initiate the time-out procedure on SESSION_START",
        input: {
            transcript: "SESSION_START",
            currentState: { ...initialMockState, currentStepKey: '' },
        },
        expectedOutput: {
            action: "START_TIMEOUT",
            speak: "Time-out initiated. Please state your name and role, starting with the attending surgeon."
        }
    },
    // 2. Attending Introduction
    {
        description: "[Time-Out] Should prompt for the resident's name after the attending introduces themselves",
        input: {
            transcript: "James Harris attending.",
            currentState: { ...initialMockState, currentStepKey: 'timeout' },
        },
        expectedOutput: {
            action: "SPEAK",
            speak: "Thank you. Can the resident now please state their name and role?"
        }
    },
    // 3. Resident Introduction & Time-Out Complete
    {
        description: "[Time-Out] Should complete the time-out and start Port Placement after the resident intro",
        input: {
            transcript: "Hanakakesh resident.",
            currentState: { ...initialMockState, currentStepKey: 'timeout' },
        },
        expectedOutput: {
            action: "COMPLETE_TIMEOUT",
            speak: "Time-out complete. Ready to begin."
        }
    },
    // 4. Port Placement - Silent Logging of Instrument Request
    {
        description: "[Port Placement] Should remain silent and log a note for a standard instrument request",
        input: {
            transcript: "Scalpel, please.",
            currentState: { ...initialMockState, currentStepKey: 'portPlacement', timeElapsedInSession: 75 },
        },
        expectedOutput: { action: "LOG_NOTE", payload: { note: "User requested scalpel." } }
    },
     // 5. Port Placement - Silent Operation during general chatter
    {
        description: "[Port Placement] Should do nothing for irrelevant chatter",
        input: {
            transcript: "Yeah. It's like a skin graft. You did it last time too.",
            currentState: { ...initialMockState, currentStepKey: 'portPlacement', timeElapsedInSession: 60 },
        },
        expectedOutput: { action: "NONE" }
    },
    // 6. Implicit Step Inference: Port Placement -> Robot Docking
    {
        description: "[Implicit] Should proactively suggest moving to Robot Docking based on verbal cues",
        input: {
            transcript: "Alright, can you drive the robot here now? A little closer.",
            currentState: { currentStepKey: 'portPlacement', timeElapsedInStep: 150, timeElapsedInSession: 180, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "SPEAK_AND_CONFIRM",
            payload: { stepKey: "robotDocking" },
            speak: "Observing requests to move the robot. It looks like we are moving to 'Docking the robot'. Please confirm."
        }
    },
    // 7. Explicit Confirmation of Step Change
    {
        description: "[Confirmation] Should change step to Robot Docking after explicit confirmation",
        input: {
            transcript: "Hey Veritas, confirm we've moved on.",
            currentState: { currentStepKey: 'portPlacement', timeElapsedInStep: 155, timeElapsedInSession: 185, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "CHANGE_STEP",
            payload: { stepKey: "robotDocking" },
            speak: "Acknowledged. Starting Docking the robot."
        }
    },
    // 8. Handling Incorrect Step Rejection
    {
        description: "[Correction] Should revert to the previous step if the user rejects the suggestion",
        input: {
            transcript: "No, we are still on port placement.",
            currentState: { currentStepKey: 'portPlacement', timeElapsedInStep: 160, timeElapsedInSession: 190, lastCheckinTime: null },
            lastSpokenMessage: "Observing requests to move the robot. It looks like we are moving to 'Docking the robot'. Please confirm."
        },
        expectedOutput: {
            action: "REVERT_STEP",
            speak: "Understood. Reverting to Port Placement."
        }
    },
    // 9. Moving from Robot Docking to Instrument Placement
    {
        description: "[Implicit] Should suggest moving to Instrument Placement after docking is complete",
        input: {
            transcript: "Okay, the robot is docked. Can I get the instruments please?",
            currentState: { currentStepKey: 'robotDocking', timeElapsedInStep: 180, timeElapsedInSession: 360, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "SPEAK_AND_CONFIRM",
            payload: { stepKey: "instrumentPlacement" },
            speak: "Observing requests for instruments. It looks like we are moving to 'Instrument Placement'. Please confirm."
        }
    },
    // 10. Manual Step Change
    {
        description: "[Correction] Should change step when told to by the user directly",
        input: {
            transcript: "Hey Veritas, we have now started the dissection of Calot's triangle.",
            currentState: { currentStepKey: 'instrumentPlacement', timeElapsedInStep: 90, timeElapsedInSession: 450, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "CHANGE_STEP",
            payload: { stepKey: 'calotTriangleDissection' },
            speak: "Acknowledged. Starting Dissection of Calot's Triangle."
        }
    },
    // 11. Answering a Direct Question about Time
    {
        description: "[Query] Should answer a direct question about the time in the current step",
        input: {
            transcript: "Hey, Veritas. How how long have we been doing this port placement?",
            currentState: { currentStepKey: 'portPlacement', timeElapsedInStep: 501, timeElapsedInSession: 501, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "SPEAK",
            speak: "We've been on Port Placement for 8 minutes and 21 seconds."
        }
    },
    // 12. Intelligent Check-in
    {
        description: "[Check-in] Should perform the first check-in when time exceeds 75% of estimate",
        input: {
            transcript: "Just keep working that tissue plane.",
            // Calot's Triangle Dissection is estimated at 3 mins (180s). 75% is 135s.
            currentState: { currentStepKey: 'calotTriangleDissection', timeElapsedInStep: 136, timeElapsedInSession: 586, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "CHECK_IN",
            speak: "We've been on Dissection of Calot's Triangle for 02:16. Attending, how is the resident progressing?"
        }
    },
    // 13. Direct Correction and Back-filling a Missed Step
    {
        description: "[Correction] Should handle a direct correction and backfill a missed step",
        input: {
            transcript: "Hey Veritas, we actually finished clipping five minutes ago and are now dissecting the gallbladder.",
            currentState: { currentStepKey: 'cysticArteryDuctClipping', timeElapsedInStep: 600, timeElapsedInSession: 2000, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "CORRECT_AND_BACKFILL",
            payload: {
                correctStepKey: "gallbladderDissection",
                startTimeAgo: "approximately 5 minutes"
            },
            speak: "Understood. Updating to 'Gallbladder Dissection of the Liver', which started approximately 5 minutes ago."
        }
    },
    // 14. Implicit Confirmation by Instrument Request
    {
        description: "[Implicit] Should confirm a proposed step change when a relevant instrument is requested",
        input: {
            transcript: "Clip applier, please.",
            currentState: { currentStepKey: 'calotTriangleDissection', timeElapsedInStep: 240, timeElapsedInSession: 1800, lastCheckinTime: null },
            lastSpokenMessage: "Observing identification of the cystic artery and duct... It looks like we are moving to 'Clipping and division of Cystic Artery and Duct'. Please confirm."
        },
        expectedOutput: {
            action: "CHANGE_STEP",
            payload: { "stepKey": "cysticArteryDuctClipping" },
            speak: "Acknowledged. Starting Clipping and division of Cystic Artery and Duct."
        }
    },
    // 15. Proactive Suggestion for Final Step
    {
        description: "[Implicit] Should suggest moving to Port Closure on 'Gas off, lights on'",
        input: {
            transcript: "Alright. Gas off. Lights on.",
            currentState: { currentStepKey: 'specimenRemoval', timeElapsedInStep: 480, timeElapsedInSession: 4200, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "SPEAK_AND_CONFIRM",
            payload: { stepKey: "undocking" }, // Assuming undocking comes after specimen removal
            speak: "Observing gas off and lights on. It looks like we are moving to 'Undocking and Tocar Removal'. Please confirm."
        }
    },
    // 16. Handling AI Confusion and User Correction
    {
        description: "[Correction] Should accept user correction when it gets confused and asks for the current step",
        input: {
            transcript: "We're still removing the gallbladder from the cystic plate.",
            currentState: { currentStepKey: 'gallbladderDissection', timeElapsedInStep: 300, timeElapsedInSession: 3000, lastCheckinTime: null },
            lastSpokenMessage: "Understood. Please state which step we are currently on."
        },
        expectedOutput: {
            action: "REVERT_STEP",
            speak: "Acknowledged. Resuming Gallbladder Dissection of the Liver."
        }
    },
    // 17. Logging a specific warning
    {
        description: "[Logging] Should log a specific safety warning as a note",
        input: {
            transcript: "That grasper has a tooth on it, don't use that one.",
            currentState: { currentStepKey: 'calotTriangleDissection', timeElapsedInStep: 100, timeElapsedInSession: 1500, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "LOG_NOTE",
            payload: { note: "Attending warned against using a grasper with a tooth due to risk of trauma." }
        }
    },
    // 18. Answering a Casual Question about its Name
    {
        description: "[Query] Should answer a casual question about its own name without a wake word",
        input: {
            transcript: "What's the name of the AI?",
            currentState: { currentStepKey: 'portClosure', timeElapsedInStep: 120, timeElapsedInSession: 4000, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "SPEAK",
            speak: "I am Veritas."
        }
    },
    // 19. Final Step Confirmation
    {
        description: "[Confirmation] Should acknowledge the final step of the procedure",
        input: {
            transcript: "Now proceeding with skin closure.",
            currentState: { currentStepKey: 'undocking', timeElapsedInStep: 300, timeElapsedInSession: 4500, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "CHANGE_STEP",
            payload: { stepKey: "skinClosure" },
            speak: "Acknowledged. Starting Skin Closure."
        }
    },
    // 20. End of Case Recognition
    {
        description: "[End of Case] Should recognize that skin closure is the final step",
        input: {
            transcript: "Alright, last stitch is in. We're done here.",
            currentState: { currentStepKey: 'skinClosure', timeElapsedInStep: 480, timeElapsedInSession: 5000, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "SPEAK",
            speak: "Skin Closure is the final step in this procedure. Case complete."
        }
    },
     // 21. Handling a direct command to revert a step
    {
        description: "[Correction] Should handle a direct command to go back a step",
        input: {
            transcript: "Hey Veritas, go back, we are not on clipping yet.",
            currentState: { currentStepKey: 'cysticArteryDuctClipping', timeElapsedInStep: 10, timeElapsedInSession: 1810, lastCheckinTime: null },
        },
        expectedOutput: {
            action: "REVERT_STEP",
            payload: { stepKey: "calotTriangleDissection" },
            speak: "Understood. Reverting to Dissection of Calot's Triangle."
        }
    },
];