import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
  attendingScore?: number;
  attendingComments?: string;
  attendingTime?: string;
}

interface ProcedureStep {
  key: string;
  name: string;
  goalTime: string;
}

interface EvaluationData {
  [key: string]: EvaluationStep | number | string | boolean | undefined;
  caseDifficulty: number;
  additionalComments: string;
  attendingCaseDifficulty?: number;
  attendingAdditionalComments?: string;
  transcription: string;
  surgery: string;
  residentName?: string;
  additionalContext?: string;
  isFinalized?: boolean;
}

const difficultyDescriptions = {
    standard: {
        1: 'Low Difficulty: Primary, straightforward case with normal anatomy and no prior abdominal or pelvic surgeries. Minimal dissection required; no significant adhesions or anatomical distortion.',
        2: 'Moderate Difficulty: Case involves mild to moderate adhesions or anatomical variation. May include BMI-related challenges, large hernias, or prior unrelated abdominal surgeries not directly affecting the operative field.',
        3: 'High Difficulty: Redo or complex case with prior related surgeries (e.g., prior hernia repair, laparotomy). Significant adhesions, distorted anatomy, fibrosis, or other factors requiring advanced dissection and judgment.'
    },
    lapAppy: {
        1: 'Low: Primary, straightforward case with normal anatomy',
        2: 'Moderate: Mild adhesions or anatomical variation',
        3: 'High: Dense adhesions, distorted anatomy, prior surgery, or perforated/complicated appendicitis'
    }
};

// FIX: Added the 'goalTime' property to every procedure step
const EVALUATION_CONFIGS: { [key: string]: { procedureSteps: ProcedureStep[], caseDifficultyDescriptions: { [key: number]: string } } } = {
    'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement and Creation of Preperitoneal Space', goalTime: '15-30 minutes' },
            { key: 'herniaDissection', name: 'Hernia Sac Reduction and Dissection of Hernia Space', goalTime: '15-30 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement', goalTime: '10-15 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Laparoscopic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", goalTime: '10-25 minutes' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', goalTime: '5-10 minutes' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', goalTime: '10-20 minutes' },
            { key: 'specimenRemoval', name: 'Specimen removal', goalTime: '5-10 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Robotic Cholecystectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'calotTriangleDissection', name: "Dissection of Calot's Triangle", goalTime: '10-25 minutes' },
            { key: 'cysticArteryDuctClipping', name: 'Clipping and division of Cystic Artery and Duct', goalTime: '5-10 minutes' },
            { key: 'gallbladderDissection', name: 'Gallbladder Dissection of the Liver', goalTime: '10-20 minutes' },
            { key: 'specimenRemoval', name: 'Specimen removal', goalTime: '5-10 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'robotDocking', name: 'Docking the robot', goalTime: '5-15 minutes' },
            { key: 'instrumentPlacement', name: 'Instrument Placement', goalTime: '2-5 minutes' },
            { key: 'herniaReduction', name: 'Reduction of Hernia', goalTime: '10-20 minutes' },
            { key: 'flapCreation', name: 'Flap Creation', goalTime: '20-40 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation', goalTime: '15-30 minutes' },
            { key: 'flapClosure', name: 'Flap Closure', goalTime: '10-20 minutes' },
            { key: 'undocking', name: 'Undocking/trocar removal', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '5-10 minutes' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Robotic Lap Ventral Hernia Repair (TAPP)': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'robotDocking', name: 'Docking the robot', goalTime: '5-15 minutes' },
            { key: 'instrumentPlacement', name: 'Instrument Placement', goalTime: '2-5 minutes' },
            { key: 'herniaReduction', name: 'Reduction of Hernia', goalTime: '10-20 minutes' },
            { key: 'flapCreation', name: 'Flap Creation', goalTime: '20-40 minutes' },
            { key: 'herniaClosure', name: 'Hernia Closure', goalTime: '10-20 minutes' },
            { key: 'meshPlacement', name: 'Mesh Placement/Fixation', goalTime: '15-30 minutes' },
            { key: 'flapClosure', name: 'Flap Closure', goalTime: '10-20 minutes' },
            { key: 'undocking', name: 'Undocking/trocar removal', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '5-10 minutes' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.standard,
    },
    'Laparoscopic Appendicectomy': {
        procedureSteps: [
            { key: 'portPlacement', name: 'Port Placement', goalTime: '5-10 minutes' },
            { key: 'appendixDissection', name: 'Identification, Dissection & Exposure of Appendix', goalTime: '10-20 minutes' },
            { key: 'mesoappendixDivision', name: 'Division of Mesoappendix and Appendix Base', goalTime: '5-10 minutes' },
            { key: 'specimenExtraction', name: 'Specimen Extraction', goalTime: '2-5 minutes' },
            { key: 'portClosure', name: 'Port Closure', goalTime: '5-10 minutes' },
            { key: 'skinClosure', name: 'Skin Closure', goalTime: '2-5 minutes' },
        ],
        caseDifficultyDescriptions: difficultyDescriptions.lapAppy,
    },
};

export default function ResultsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [editedEvaluation, setEditedEvaluation] = useState<EvaluationData | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [surgery, setSurgery] = useState('');
  const [residentName, setResidentName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [procedureSteps, setProcedureSteps] = useState<ProcedureStep[]>([]);
  const [showTranscription, setShowTranscription] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isOriginalFileVideo, setIsOriginalFileVideo] = useState(false);
  const [visualAnalysisPerformed, setVisualAnalysisPerformed] = useState(false);

  useEffect(() => {
    const fetchEvaluation = async (jobId: string) => {
        try {
            const response = await fetch(`/api/job-status/${jobId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch evaluation data.');
            }
            const jobData = await response.json();

            if (jobData.status === 'complete' && jobData.result) {
                const parsedData = jobData.result;
                setEvaluation(parsedData);
                setEditedEvaluation(JSON.parse(JSON.stringify(parsedData)));
                setSurgery(parsedData.surgery);
                setResidentName(parsedData.residentName || '');
                setAdditionalContext(parsedData.additionalContext || '');
                setIsFinalized(parsedData.isFinalized || false);

                setVisualAnalysisPerformed(jobData.withVideo && jobData.videoAnalysis);
                setIsOriginalFileVideo(jobData.withVideo);
                
                if (jobData.readableUrl) {
                    setMediaUrl(jobData.readableUrl);
                }
                if (jobData.thumbnailUrl) {
                    setThumbnailUrl(jobData.thumbnailUrl);
                }

                const config = EVALUATION_CONFIGS[parsedData.surgery as keyof typeof EVALUATION_CONFIGS];
                if (config) {
                    setProcedureSteps(config.procedureSteps);
                }
            } else if (jobData.status === 'pending' || jobData.status.startsWith('processing')) {
                alert('This evaluation is still being processed. Please wait a moment and refresh.');
                router.push('/');
            } else {
                 throw new Error(jobData.error || 'Evaluation not found or has failed.');
            }
        } catch (error) {
            console.error("Failed to fetch evaluation data", error);
            alert("Could not load the evaluation. Redirecting to the home page.");
            router.push('/');
        }
    };

    if (id && typeof id === 'string') {
        fetchEvaluation(id);
    }
  }, [id, router]);

  const handleFinalize = async () => {
    if (editedEvaluation && id) {
      const finalEvaluation = { ...editedEvaluation, isFinalized: true };
      try {
        const response = await fetch(`/api/evaluations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updatedEvaluation: finalEvaluation }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to finalize evaluation.');
        }

        setIsFinalized(true);
        setEditedEvaluation(finalEvaluation);
        alert('Evaluation has been finalized!');
      } catch (error) {
          console.error('Finalization error:', error);
          alert(error instanceof Error ? error.message : 'An unknown error occurred.');
      }
    }
  };
  
  const handleSendEmail = async () => {
    if (!email) {
      setEmailMessage('Please enter a valid email address.');
      return;
    }
    if (!editedEvaluation) {
        setEmailMessage('Evaluation data is not available to send.');
        return;
    }
    setIsSending(true);
    setEmailMessage('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          surgery: surgery,
          evaluation: editedEvaluation,
          residentName: residentName,
          additionalContext: additionalContext,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email.');
      }

      setEmailMessage(`Email sent!`);
      setEmail('');
    } catch (error) {
      console.error(error);
      setEmailMessage(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleEvaluationChange = (stepKey: string, field: string, value: string | number | undefined) => {
    if (editedEvaluation) {
        const newEvaluation = { ...editedEvaluation };
        (newEvaluation[stepKey] as EvaluationStep) = {
            ...(newEvaluation[stepKey] as EvaluationStep),
            [field]: value,
        };
        setEditedEvaluation(newEvaluation);
    }
  };

  const handleOverallChange = (field: string, value: string | number | undefined) => {
    if (editedEvaluation) {
        setEditedEvaluation({ ...editedEvaluation, [field]: value });
    }
  };

  if (!evaluation || !editedEvaluation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
         <div className="text-center">
            <p className="text-xl text-gray-700 dark:text-gray-300">Loading evaluation results...</p>
         </div>
      </div>
    );
  }

  const descriptions = EVALUATION_CONFIGS[surgery as keyof typeof EVALUATION_CONFIGS]?.caseDifficultyDescriptions;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
        
        <div className="flex justify-between items-start mb-8">
            <div className="w-[160px] flex-shrink-0"></div>
            <div className="text-center flex-grow">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                  {isFinalized ? 'Final Evaluation' : 'AI-Generated Evaluation Draft'}
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-300 mb-4">
                  {surgery}
                </p>
                {residentName && <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">Resident: {residentName}</p>}
            </div>
            <div className="w-[160px] flex-shrink-0 flex justify-end">
                <Image 
                    src={visualAnalysisPerformed ? '/images/visualAnalysis.png' : '/images/audioAnalysis.png'}
                    alt={visualAnalysisPerformed ? 'Visual Analysis' : 'Audio Analysis'}
                    width={160}
                    height={50}
                />
            </div>
        </div>

        {mediaUrl && (
          <div className="mb-8 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-slate-700/50">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {isOriginalFileVideo ? 'View Recording' : 'Listen to Recording'}
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-32 h-20 bg-black rounded-md overflow-hidden relative flex items-center justify-center">
                {isOriginalFileVideo ? (
                    thumbnailUrl ? (
                        <Image src={thumbnailUrl} alt="Video thumbnail" layout="fill" objectFit="cover" />
                    ) : (
                        <svg className="h-8 w-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" /></svg>
                    )
                ) : (
                    <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"></path></svg>
                )}
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">The original uploaded recording is available for review.</p>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-brand-green text-white px-5 py-2.5 rounded-lg shadow-md text-sm font-semibold hover:bg-brand-green-500 transform transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:ring-offset-2"
                >
                  {isOriginalFileVideo ? 'Open Video in New Tab' : 'Open Audio in New Tab'}
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
            {procedureSteps.map((step) => (
                <EvaluationSection 
                    key={step.key}
                    step={step}
                    aiData={evaluation[step.key] as EvaluationStep}
                    editedData={editedEvaluation[step.key] as EvaluationStep}
                    isFinalized={isFinalized}
                    onChange={(field, value) => handleEvaluationChange(step.key, field, value)}
                />
            ))}
        </div>
        <div className="mt-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Overall Assessment</h2>
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-gray-50 dark:bg-slate-700/50 space-y-4">
                {additionalContext && (
                    <div>
                        <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Provided Context:</h4>
                        <p className="text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-600 p-4 rounded-md italic">{additionalContext}</p>
                    </div>
                )}
                {descriptions && (
                    <div className="mt-4">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Case Difficulty Descriptions:</h3>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-200 space-y-1">
                            {Object.entries(descriptions).map(([key, value]) => (
                                <li key={key}><strong>{key}:</strong> {value}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <p className="text-gray-900 dark:text-white pt-4"><strong>AI Case Difficulty:</strong> <span className="font-bold text-lg text-brand-green">{evaluation.caseDifficulty} / 3</span></p>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed bg-white dark:bg-slate-600 p-4 rounded-md"><strong>AI Final Remarks:</strong> {evaluation.additionalComments}</p>
                <div className="mt-4">
                    <label className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Attending Case Difficulty:</label>
                    <input 
                        type="number" 
                        min="1" max="3" 
                        value={editedEvaluation.attendingCaseDifficulty ?? ''}
                        placeholder={evaluation.caseDifficulty?.toString()}
                        onChange={(e) => handleOverallChange('attendingCaseDifficulty', e.target.value ? parseInt(e.target.value) : undefined)}
                        disabled={isFinalized}
                        className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                    />
                </div>
                <div>
                    <label className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Attending Final Remarks:</label>
                    <textarea 
                        value={editedEvaluation.attendingAdditionalComments ?? ''}
                        placeholder={evaluation.additionalComments}
                        onChange={(e) => handleOverallChange('attendingAdditionalComments', e.target.value)}
                        disabled={isFinalized}
                        className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                        rows={4}
                    />
                </div>
            </div>
        </div>
        <div className="mt-8">
          <div
            onClick={() => setShowTranscription(!showTranscription)}
            className="flex justify-between items-center cursor-pointer border-b pb-2 border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Full Transcription</h2>
            <span className="text-2xl text-gray-600 dark:text-gray-300">{showTranscription ? '▲' : '▼'}</span>
          </div>
          {showTranscription && (
            <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-900/50 max-h-72 overflow-y-auto">
              {evaluation.transcription && evaluation.transcription.trim() !== '' ? (
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono text-sm">{evaluation.transcription}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Full transcription is not available.</p>
              )}
            </div>
          )}
        </div>
        {!isFinalized && (
            <button
                onClick={handleFinalize}
                className="mt-10 w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-500 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg font-semibold"
            >
                Finalize Evaluation
            </button>
        )}
        {isFinalized && (
            <div className="mt-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Share Results</h2>
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="flex-grow w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-brand-green focus:outline-none"
                    />
                    <button
                        onClick={handleSendEmail}
                        disabled={isSending}
                        className="w-full sm:w-auto bg-brand-green text-white px-6 py-3 rounded-lg shadow-md hover:bg-brand-green-500 transition-colors disabled:bg-gray-400"
                    >
                        {isSending ? 'Sending...' : 'Send Email'}
                    </button>
                </div>
                {emailMessage && <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">{emailMessage}</p>}
            </div>
        )}
        <button
          onClick={() => router.push('/')}
          className="mt-10 w-full bg-gray-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-gray-500 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-lg font-semibold"
        >
          Evaluate Another Procedure
        </button>
      </div>
    </div>
  );
}

const EvaluationSection = ({ step, aiData, editedData, isFinalized, onChange }: { step: ProcedureStep, aiData: EvaluationStep, editedData: EvaluationStep, isFinalized: boolean, onChange: (field: string, value: string | number | undefined) => void }) => {
    const [isManuallyOpened, setIsManuallyOpened] = useState(false);
    const wasPerformed = aiData && aiData.score > 0;

    if (!wasPerformed && !isManuallyOpened) {
        return (
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-slate-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{step.name}</h3>
                <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-600 p-3 rounded-md mt-1 italic">
                    {aiData?.comments || "This step was not performed or mentioned in the provided transcript."}
                </p>
                {!isFinalized && (
                    <button 
                        onClick={() => setIsManuallyOpened(true)}
                        className="mt-4 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500"
                    >
                        Manually Evaluate Step
                    </button>
                )}
            </div>
        );
    }
    
    return (
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-slate-700 hover:shadow-md transition-shadow">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{step.name}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p className="font-medium text-gray-600 dark:text-gray-300">AI Performance Score:</p>
                <p className="text-2xl font-bold text-brand-green">{wasPerformed ? `${aiData.score} / 5` : 'N/A'}</p>
            </div>
            <div>
                <label className="font-medium text-gray-600 dark:text-gray-300">Attending Score:</label>
                <input 
                    type="number" 
                    min="0" max="5" 
                    value={editedData.attendingScore ?? ''}
                    placeholder={aiData.score > 0 ? aiData.score.toString() : '0'}
                    onChange={(e) => onChange('attendingScore', e.target.value ? parseInt(e.target.value) : undefined)}
                    disabled={isFinalized}
                    className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                />
            </div>
            <div>
                <p className="font-medium text-gray-600 dark:text-gray-300">Goal Time:</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{step.goalTime}</p>
            </div>
            <div>
                <label className="font-medium text-gray-600 dark:text-gray-300">Time Taken:</label>
                <input 
                    type="text"
                    value={editedData.attendingTime ?? ''}
                    placeholder={aiData.time}
                    onChange={(e) => onChange('attendingTime', e.target.value)}
                    disabled={isFinalized}
                    className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500"
                />
            </div>
        </div>
        <div className="mt-4">
            <p className="font-medium text-gray-600 dark:text-gray-300">AI-Generated Comments:</p>
            <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-600 p-3 rounded-md mt-1">{wasPerformed ? aiData.comments : 'N/A'}</p>
        </div>
        <div className="mt-4">
            <label className="font-medium text-gray-600 dark:text-gray-300">Attending Comments:</label>
            <textarea 
                value={editedData.attendingComments ?? ''}
                placeholder={aiData.comments}
                onChange={(e) => onChange('attendingComments', e.target.value)}
                disabled={isFinalized}
                className="w-full p-2 border rounded-md dark:bg-slate-600 dark:border-gray-500 mt-1"
                rows={3}
            />
        </div>
      </div>
    );
};