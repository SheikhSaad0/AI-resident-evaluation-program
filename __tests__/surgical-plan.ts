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
      "James Harris, attending.",
      "Saad Mahmood, resident.",
    ],
  },
  {
    name: "Port Placement",
    objective: "Place ports while engaging in normal OR chatter. Veritas should remain silent unless a specific trigger is met.",
    user_prompts: [
      "Scalpel, please.",
      "Nice. Two AdSONs, please, and I'll take the knife.",
      "Alright, let's go into reverse T.",
      "I'll do one and you do the other two.",
      "Last port is in",
    ],
  },
  {
    name: "Robot Docking & Ambiguity",
    objective: "Provide a mix of direct and indirect cues for robot docking to test if Veritas can handle forward-looking statements without changing the step prematurely.",
    user_prompts: [
      "Drive the robot in now",
      "Alright, let's go ahead and deploy for docking.",
      "Drive the robot in, just a little closer.",
      "Make sure when you're docking your laser target, you don't pull the trocars in and out. Stabilize it.",
      "Targeting complete. Drop the remaining arm.",
    ],
  },
  {
    name: "Instrument Placement & Correction Test",
    objective: "Test the AI's ability to differentiate a question from a correction and handle instrument changes.",
    user_prompts: [
      "Alright, let's get the instruments in. in arm one.",
      "Careful, that grasper has a tooth on it. Let's switch it out for a Maryland.",
      "Hey Veritas, how long have we been on this step?",
      "Okay, all instruments are in. Let's get started.",
    ],
  },
  {
    name: "Calot's Triangle Dissection & Stress Test",
    objective: "Perform a lengthy dissection with a safety warning and repeated phrases to test the AI's check-in logic and ability to avoid getting stuck.",
    user_prompts: [
      "Just carefully working this tissue plane.",
      "We have some adhesions we have to deal with now.",
      "Just keep working that plane, nice and easy.", // Repetitive chatter
      "Okay, I can see the critical view now. I think we're ready.",
      "What's the time, Veritas?",
    ],
  },
  {
    name: "Clipping & Back-filling Test",
    objective: "Use an explicit, timed correction to test the back-filling logic accurately.",
    user_prompts: [
      "Clip applier, please.",
      "Two down, one up.",
      "Hey Veritas, we actually finished clipping around two minutes ago. We are now taking the gallbladder off the liver.",
    ],
  },
  {
    name: "Gallbladder Dissection of the Liver",
    objective: "Simulate a standard gallbladder dissection with coaching and feedback.",
    user_prompts: [
      "Alright, let's take this gallbladder off the liver.",
      "Follow that plane of edema.",
      "You're getting a little deep there. Stay on the gallbladder side.",
      "Nice, that's a good plane. Keep going.",
    ],
  },
  {
    name: "Specimen Removal",
    objective: "Use a clear trigger phrase and then conclude the case, testing the final step logic.",
    user_prompts: [
      "Alright, the gallbladder is free.",
      "Bag, please.",
      "Extend it just under it, yes",
    ],
  },
  {
    name: "Undocking and Trocar Removal",
    objective: "Simulate the process of undocking the robot and removing the trocars.",
    user_prompts: [
      "Gas off. Lights on.",
      "Okay, let's undock.",
      "Bring everything high and together so it's easy to drive out.",
      "Let's get these trocars out.",
    ],
  },
  {
    name: "Skin Closure",
    objective: "Simulate the final step of the procedure with some casual conversation.",
    user_prompts: [
      "Alright, let's close up.",
      "You can do a running stitch on that one.",
      "This was a good case. The robot behaved today.",
      "Alright, we're all done here.",
      "Can I get the total case time?",
    ],
  },
  {
    name: "Post-Op Trivia",
    objective: "Ask some casual questions to test the AI's ability to handle non-medical queries.",
    user_prompts: [
      "Hand me that grasper please",
      "What's the name of the AI again?",
      "Hey Veritas, who was the sidekick to Johnny Carson on The Tonight Show?",
    ],
  },
];