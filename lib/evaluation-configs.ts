// lib/evaluation-configs.ts

// This file centralizes the definitions for all surgical procedures.
// Both the live AI (ai.ts) and the post-op processor (process-job.ts) can import from here,
// ensuring consistency and eliminating code duplication.

export interface ProcedureStepConfig {
  key: string;
  name: string;
  time?: string; // Optional: Expected time for live tracking
}

const difficultyDescriptions = {
    standard: {
        1: 'Low Difficulty: Primary, straightforward case with normal anatomy and no prior abdominal or pelvic surgeries.',
        2: 'Moderate Difficulty: Case involves mild to moderate adhesions or anatomical variation.',
        3: 'High Difficulty: Redo or complex case with prior related surgeries. Significant adhesions, distorted anatomy, or fibrosis.'
    },
    lapAppy: {
        1: 'Low: Primary, straightforward case with normal anatomy.',
        2: 'Moderate: Mild adhesions or anatomical variation.',
        3: 'High: Dense adhesions, distorted anatomy, or perforated/complicated appendicitis.'
    }
};

export interface EvaluationConfigs {
    [key: string]: {
        name: string;
        procedureSteps: ProcedureStepConfig[];
        caseDifficultyDescriptions: { [key: number]: string };
    };
}

export const EVALUATION_CONFIGS: EvaluationConfigs = {
    'laparoscopic-inguinal-hernia-repair-tep': {
        name: 'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space', time: '10-15 min' },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection', time: '15-25 min' },
            { key: 'meshPlacement', name: 'Mesh Placement', time: '10-15 min' },
            { key: 'portClosure', name: 'Port Closure & Skin Closure', time: '5-10 min' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'laparoscopic-cholecystectomy': {
        name: 'Laparoscopic Cholecystectomy',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '5-10 min' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", time: '15-25 min' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', time: '5-10 min' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', time: '10-20 min' },
            { key: 'specimenRemoval', name: 'Specimen removal', time: '5-10 min' },
            { key: 'portClosure', name: 'Port Closure & Skin Closure', time: '5-10 min' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'robotic-cholecystectomy': {
        name: 'Robotic Cholecystectomy',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '5-10 min' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", time: '15-25 min' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', time: '5-10 min' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', time: '10-20 min' },
            { key: 'specimenRemoval', name: 'Specimen removal', time: '5-10 min' },
            { key: 'portClosure', name: 'Port Closure & Skin Closure', time: '5-10 min' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
     'robotic-inguinal-hernia-repair-tapp': {
        name: 'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '10-15 min' },
            { key: 'robotDocking', name: 'Docking the robot', time: '5-10 min' },
            { key: 'herniaReduction', name: 'Reduction of Hernia & Flap Creation', time: '15-25 min' },
            { key: 'meshPlacement', name: 'Mesh Placement and Fixation', time: '10-15 min' },
            { key: 'flapClosure', name: 'Flap Closure', time: '15-20 min' },
            { key: 'undocking', name: 'Undocking and Skin Closure', time: '5-10 min' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
};