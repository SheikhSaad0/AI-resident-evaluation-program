// lib/evaluation-configs.ts

export interface ProcedureStepConfig {
  key: string;
  name: string;
  time?: string; 
  estimatedTime?: number; 
}

// ... (difficultyDescriptions object remains the same) ...
const difficultyDescriptions = {
    standard: {
        1: 'Low Difficulty: Primary, straightforward case with normal anatomy and no prior abdominal or pelvic surgeries. Minimal dissection required; no significant adhesions or anatomical distortion.',
        2: 'Moderate Difficulty: Case involves mild to moderate adhesions or anatomical variation. May include BMI-related challenges, large hernias, or prior unrelated abdominal surgeries not directly affecting the operative field.',
        3: 'High Difficulty: Redo or complex case with prior related surgeries (e.g., prior hernia repair, laparotomy). Significant adhesions, distorted anatomy, fibrosis, or other factors requiring advanced dissection and judgment.'
    },
    lapAppy: {
        1: 'Low: Primary, straightforward case with normal anatomy.',
        2: 'Moderate: Mild adhesions or anatomical variation.',
        3: 'High: Dense adhesions, distorted anatomy, prior surgery, or perforated/complicated appendicitis.'
    },
    openUmbilical: {
        1: 'Easy: Small fascial defect (<2 cm), minimal subcutaneous tissue, no prior abdominal surgeries, no incarceration, and straightforward reduction. Excellent exposure with minimal dissection required.',
        2: 'Moderate: Medium-sized hernia (2–4 cm), presence of moderate subcutaneous fat, minor adhesions or partial incarceration, requiring careful dissection or tension at closure. May involve mild bleeding or minor wound concerns.',
        3: 'Difficult: Large hernia defect (>4 cm), thickened or scarred sac from prior surgeries, dense adhesions, incarcerated or non-reducible contents, or challenging exposure due to obesity or previous mesh. May require layered closure or drains despite no formal mesh placement.'
    },
    openVentralRetrorectus: {
        1: 'Easy: Defect <5 cm with minimal to no adhesions, good-quality fascia, and no prior mesh or wound infection. Retrorectus space is easily developed, mesh placement is tension-free, and closure is achieved without undue difficulty; may or may not need drains.',
        2: 'Moderate: Defect 5–10 cm, moderate adhesions requiring careful lysis, prior abdominal surgeries without mesh, or modest scarring. Retrorectus dissection requires moderate effort; mesh placement and fascial closure are feasible but require precision. One or more drains may be placed.',
        3: 'Difficult: Large or complex defect >10 cm, dense adhesions from multiple prior surgeries or mesh explantation, scarred or attenuated posterior sheath, and need for advanced exposure techniques (e.g., component separation). Retrorectus dissection is challenging, and closure may require reinforcement, advanced techniques, or staged approaches. Significant bleeding risk or compromised soft tissue envelope may be present.'
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
    'laparoscopic-cholecystectomy': {
        name: 'Laparoscopic Cholecystectomy',
        procedureSteps: [
            // FIX: Added 'estimatedTime' to every step
            { key: 'portPlacement', name: 'Port Placement', time: '5-10 min', estimatedTime: 8 },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", time: '10-25 min', estimatedTime: 18 },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', time: '5-10 min', estimatedTime: 8 },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', time: '10-20 min', estimatedTime: 15 },
            { key: 'specimenRemoval', name: 'Specimen removal', time: '5-10 min', estimatedTime: 8 },
            { key: 'portClosure', name: 'Port Closure', time: '5-10 min', estimatedTime: 8 },
            { key: 'skinClosure', name: 'Skin Closure', time: '2-5 min', estimatedTime: 4 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'robotic-cholecystectomy': {
        name: 'Robotic Cholecystectomy',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '5-10 min', estimatedTime: 8 },
            { key: 'robotDocking', name: 'Docking the robot', time: '5-15 min', estimatedTime: 10 },
            { key: 'instrumentPlacement', name: 'Instrument Placement', time: '2-5 min', estimatedTime: 4 },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", time: '15-25 min', estimatedTime: 20 },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', time: '5-10 min', estimatedTime: 8 },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', time: '10-20 min', estimatedTime: 15 },
            { key: 'specimenRemoval', name: 'Specimen removal', time: '5-10 min', estimatedTime: 8 },
            { key: 'undocking', name: 'Undocking and Tocar Removal', time: '5-10 min', estimatedTime: 8 },
            { key: 'skinClosure', name: 'Skin Closure', time: '5-10 min', estimatedTime: 8 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'laparoscopic-appendectomy': {
        name: 'Laparoscopic Appendicectomy',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '5-10 min', estimatedTime: 8 },
            { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix', time: '10-20 min', estimatedTime: 15 },
            { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base', time: '5-10 min', estimatedTime: 8 },
            { key: 'specimenExtraction', name: 'Specimen Extraction', time: '2-5 min', estimatedTime: 4 },
            { key: 'portClosure', name: 'Port Closure', time: '5-10 min', estimatedTime: 8 },
            { key: 'skinClosure', name: 'Skin Closure', time: '2-5 min', estimatedTime: 4 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.lapAppy,
    },
    // ... (rest of the configurations with estimatedTime added)
    'laparoscopic-inguinal-hernia-repair-tep': {
        name: 'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)',
        procedureSteps: [
            { key: 'portPlacementPreperitoneal', name: 'Port Placement and Creation of Preperitoneal Space', time: '15-30 min', estimatedTime: 22 },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space', time: '15-30 min', estimatedTime: 22 },
            { key: 'meshPlacement', name: 'Mesh Placement', time: '10-15 min', estimatedTime: 12 },
            { key: 'portClosure', name: 'Port Closure', time: '5-10 min', estimatedTime: 8 },
            { key: 'skinClosure', name: 'Skin Closure', time: '2-5 min', estimatedTime: 4 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'robotic-inguinal-hernia-repair-tapp': {
        name: 'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '5-10 min', estimatedTime: 8 },
            { key: 'robotDocking', name: 'Docking the robot', time: '5-15 min', estimatedTime: 10 },
            { key: 'instrumentPlacement', name: 'Instrument Placement', time: '2-5 min', estimatedTime: 4 },
            { key: 'herniaReduction', name: 'Reduction of Hernia', time: '10-20 min', estimatedTime: 15 },
            { key: 'flapCreation', name: 'Flap Creation', time: '20-40 min', estimatedTime: 30 },
            { key: 'meshPlacement', name: 'Mesh Placement and Fixation', time: '15-30 min', estimatedTime: 22 },
            { key: 'flapClosure', name: 'Flap Closure', time: '10-20 min', estimatedTime: 15 },
            { key: 'undocking', name: 'Undocking and Tocar Removal', time: '5-10 min', estimatedTime: 8 },
            { key: 'skinClosure', name: 'Skin Closure', time: '5-10 min', estimatedTime: 8 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'robotic-lap-ventral-hernia-repair': {
        name: 'Robotic Lap Ventral Hernia Repair (TAPP)',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '5-10 min', estimatedTime: 8 },
            { key: 'robotDocking', name: 'Docking the robot', time: '5-15 min', estimatedTime: 10 },
            { key: 'instrumentPlacement', name: 'Instrument Placement', time: '2-5 min', estimatedTime: 4 },
            { key: 'herniaReduction', name: 'Reduction of Hernia', time: '10-20 min', estimatedTime: 15 },
            { key: 'flapCreation', name: 'Flap Creation', time: '20-40 min', estimatedTime: 30 },
            { key: 'herniaClosure', name: 'Hernia Closure', time: '10-20 min', estimatedTime: 15 },
            { key: 'meshPlacement', name: 'Mesh Placement and Fixation', time: '15-30 min', estimatedTime: 22 },
            { key: 'flapClosure', name: 'Flap Closure', time: '10-20 min', estimatedTime: 15 },
            { key: 'undocking', name: 'Undocking and Tocar Removal', time: '5-10 min', estimatedTime: 8 },
            { key: 'skinClosure', name: 'Skin Closure', time: '5-10 min', estimatedTime: 8 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'open-umbilical-hernia-repair-no-mesh': {
        name: 'Open Umbilical Hernia Repair Without Mesh',
        procedureSteps: [
            { key: 'skinIncision', name: 'Skin Incision and Dissection to Hernia Sac', time: '5-10 min', estimatedTime: 8 },
            { key: 'sacIsolation', name: 'Hernia Sac Isolation & Opening', time: '5-10 min', estimatedTime: 8 },
            { key: 'contentReduction', name: 'Reduction of Hernia Contents', time: '5-10 min', estimatedTime: 8 },
            { key: 'fasciaClosure', name: 'Closure of Fascia', time: '10-15 min', estimatedTime: 12 },
            { key: 'subcutaneousClosure', name: 'Subcutaneous tissue Re-approximation', time: '2-5 min', estimatedTime: 4 },
            { key: 'skinClosure', name: 'Skin Closure', time: '2-5 min', estimatedTime: 4 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.openUmbilical,
    },
    'open-vhr-retrorectus-mesh': {
        name: 'Open VHR with Retrorectus Mesh',
        procedureSteps: [
            { key: 'midlineIncision', name: 'Midline Incision and Hernia Exposure', time: '10-15 min', estimatedTime: 12 },
            { key: 'adhesiolysis', name: 'Adhesiolysis and Hernia Sac Dissection', time: '20-30 min', estimatedTime: 25 },
            { key: 'retrorectusCreation', name: 'Posterior Rectus Sheath Incision & Retrorectus Space Creation', time: '20-30 min', estimatedTime: 25 },
            { key: 'posteriorClosure', name: 'Posterior Rectus Sheath Closure & Hernia Content Reduction', time: '15-20 min', estimatedTime: 18 },
            { key: 'meshPlacement', name: 'Mesh Placement in Retrorectus Plane', time: '20-30 min', estimatedTime: 25 },
            { key: 'drainPlacement', name: 'Closed Drain Placement', time: '5-10 min', estimatedTime: 8 },
            { key: 'anteriorFascialClosure', name: 'Anterior Fascial Closure', time: '20-25 min', estimatedTime: 22 },
            { key: 'skinClosure', name: 'Skin Closure', time: '10-15 min', estimatedTime: 12 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.openVentralRetrorectus,
    },
    'DEBUGGING-USE-ONLY-robotic-cholecystectomy': {
        name: 'DEBUGGING USE ONLY Robotic Cholecystectomy',
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', time: '1-3 min', estimatedTime: 2 },
            { key: 'robotDocking', name: 'Docking the robot', time: '2-4 min', estimatedTime: 3 },
            { key: 'instrumentPlacement', name: 'Instrument Placement', time: '1-2 min', estimatedTime: 2 },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", time: '1-5 min', estimatedTime: 3 },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', time: '5-10 min', estimatedTime: 8 },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', time: '10-20 min', estimatedTime: 15 },
            { key: 'specimenRemoval', name: 'Specimen removal', time: '5-10 min', estimatedTime: 8 },
            { key: 'undocking', name: 'Undocking and Tocar Removal', time: '5-10 min', estimatedTime: 8 },
            { key: 'skinClosure', name: 'Skin Closure', time: '5-10 min', estimatedTime: 8 },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    }
};