// __tests__/surgical-plan.ts

export interface SurgicalPhase {
  name: string;
  objective: string;
  user_prompts: string[];
}

export const surgicalPlan: SurgicalPhase[] = [
  {
    name: "Time-Out",
    objective: "Initiate and complete the pre-surgery time-out procedure.",
    user_prompts: [
      "SESSION_START",
      "James Harris attending.",
      "Hanna Kakish resident.",
    ],
  },
  {
    name: "Port Placement",
    objective: "Silently place ports and make standard instrument requests. The AI should not speak unless spoken to.",
    user_prompts: [
      "Scalpel, please.",
      "Yeah. It's like a skin graft. You did it last time too.", // Irrelevant chatter
      "Trocar, please.",
    ],
  },
  {
    name: "Robot Docking",
    objective: "Give verbal cues that imply the robot is being docked. Veritas should proactively suggest a step change.",
    user_prompts: [
      "Alright, can you drive the robot here now? A little closer.",
      "Hey Veritas, confirm we've moved on.", // Explicit confirmation if needed
    ],
  },
  {
    name: "Instrument Placement",
    objective: "Request instruments for the next phase. Veritas should infer the step change.",
    user_prompts: [
      "Okay, the robot is docked. Can I get the instruments please?",
    ],
  },
  {
    name: "Calot's Triangle Dissection",
    objective: "Manually announce the start of this critical step and ask a time-related question.",
    user_prompts: [
      "Hey Veritas, we have now started the dissection of Calot's triangle.",
      "Hey, Veritas. How how long have we been doing this port placement?",
      "That grasper has a tooth on it, don't use that one.", // A safety warning to be logged
    ],
  },
  {
    name: "Cystic Artery and Duct Clipping",
    objective: "Implicitly confirm a step change by requesting a relevant instrument.",
    user_prompts: [
      "Clip applier, please.",
    ],
  },
  {
    name: "Gallbladder Dissection",
    objective: "Provide a direct correction to test the back-filling logic.",
    user_prompts: [
      "Hey Veritas, we actually finished clipping five minutes ago and are now dissecting the gallbladder.",
    ],
  },
  {
    name: "Specimen Removal & Undocking",
    objective: "Give a clear verbal cue that the main part of the surgery is over, expecting Veritas to suggest the next step.",
    user_prompts: [
      "Gas off. Lights on.",
    ],
  },
  {
    name: "Skin Closure & End of Case",
    objective: "Proceed with the final steps and conclude the operation.",
    user_prompts: [
      "Now proceeding with skin closure.",
      "last stitch is in",
      "What was the name of the AI again?", // Casual question
    ],
  },
];