// __tests__/surgical-plan.ts

export interface SurgicalPhase {
  name: string;
  objective: string;
  user_prompts: string[];
}

export const surgicalPlan: SurgicalPhase[] = [
  {
    name: "Time-Out",
    objective: "Initiate and complete the time-out procedure with perfect accuracy.",
    user_prompts: [
      "SESSION_START",
      "James Harris attending.",
      "Saad Mahmood, resident.",
    ],
  },
  {
    name: "Port Placement & Chatter",
    objective: "Place ports while engaging in normal OR chatter. Veritas should remain silent unless a specific trigger is met.",
    user_prompts: [
      "Scalpel, please.",
      "Yeah, it's like a skin graft. You did it last time too. I saw a case once where the piercing went right through the fascia.",
      "Okay, can I get the first trocar?",
      "last port is in.",
    ],
  },
  {
    name: "Robot Docking & Ambiguity",
    objective: "Provide a mix of direct and indirect cues for robot docking to test if Veritas can handle forward-looking statements without changing the step prematurely.",
    user_prompts: [
      "Bring the robot in now.", // Ambiguous cue
      "drive the robot in, just a little closer.", // Direct cue
    ],
  },
  {
    name: "Instrument Placement & Correction Test",
    objective: "Test the AI's ability to differentiate a question from a correction.",
    user_prompts: [
      "Alright, instruments are in",
      "Oh wait we still have one more left to go", // Self-correction
      "Hey Veritas, how long have we been on this step?", // This is a QUESTION, not a correction.
      "Hey veritas, hows the time?",
    ],
  },
  {
    name: "Calot's Triangle Dissection & Stress Test",
    objective: "Perform a lengthy dissection with a safety warning and repeated phrases to test the AI's check-in logic and ability to avoid getting stuck.",
    user_prompts: [
      "Just carefully working this tissue plane.",
      "We have some adhesions we have to deal with now",
      "Careful, that grasper has a tooth on it, don't use that one.",
      "Just keep working that plane, nice and easy.", // Repetitive chatter
      "Okay, I can see the critical view now. I think we're ready",
      "Whats the time, Veritas?",
    ],
  },
  {
    name: "Clipping & Back-filling Test",
    objective: "Use an explicit, timed correction to test the back-filling logic accurately.",
    user_prompts: [
      "Clip applier, please.",
      "Carefully clip the cystic duct.",
      "Move your clipper more laterally against the inferior side of the liver",
      "Yes yes good",
      "Hey Veritas, we actually finished clipping around two minutes ago. We are now taking the gallbladder off the liver.",
    ],
  },
  {
    name: "Specimen Removal & Final Steps",
    objective: "Use a clear trigger phrase and then conclude the case, testing the final step logic.",
    user_prompts: [
      "Alright, the gallbladder is free",
      "Bag please",
      "Gas off. Lights on.", // This should trigger a suggestion for Port Closure
      "Confirm. We are starting port closure.",
      "Alright, you can finish your side now.",
      "Can I get the total case time please",
    ],
  },
  {
    name: "Post-Op Trivia",
    objective: "Ask some casual questions to test the AI's ability to handle non-medical queries.",
    user_prompts: [
      "What's the name of the AI again?",
      "Hey Veritas, who was the sidekick to Johnny Carson on the Tonight Show?",
    ],
  },
];