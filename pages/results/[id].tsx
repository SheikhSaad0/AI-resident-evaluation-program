import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { GlassCard, GlassButton, GlassInput, GlassTextarea, GlassTabs, PillToggle } from '../../components/ui';

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

// --- NEW: Centralized config to match the backend ---
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
                setEvaluation(prev => ({
                    ...prev,
                    surgery: 'Processing...',
                    residentName: 'Please wait',
                    transcription: 'Your evaluation is being processed. This page will automatically update when complete.'
                } as EvaluationData));
                // Set up polling to check status again
                setTimeout(() => {
                    if (id && typeof id === 'string') {
                        fetchEvaluation(id);
                    }
                }, 5000); // Check again in 5 seconds
            } else if (jobData.status === 'failed') {
                setEvaluation(prev => ({
                    ...prev,
                    surgery: 'Analysis Failed',
                    residentName: 'Error',
                    transcription: 'The evaluation analysis failed. Please try submitting again.'
                } as EvaluationData));
            } else {
                 throw new Error(jobData.error || 'Evaluation not found or has failed.');
            }
        } catch (error) {
            console.error("Failed to fetch evaluation data", error);
            // Instead of redirecting, show error state
            setEvaluation(prev => ({
                ...prev,
                surgery: 'Error Loading Evaluation',
                residentName: 'Unknown',
                transcription: `Could not load the evaluation data. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            } as EvaluationData));
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
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard variant="strong" className="p-8 text-center">
          <div className="glassmorphism-subtle p-6 rounded-2xl w-fit mx-auto mb-4">
            <Image src="/images/dashboard-icon.svg" alt="Loading" width={32} height={32} className="opacity-50 animate-pulse" />
          </div>
          <h2 className="heading-md mb-2">Loading Evaluation</h2>
          <p className="text-text-tertiary">Please wait while we fetch the evaluation results...</p>
        </GlassCard>
      </div>
    );
  }

  const descriptions = EVALUATION_CONFIGS[surgery as keyof typeof EVALUATION_CONFIGS]?.caseDifficultyDescriptions;

  const getSurgeryIcon = (surgery: string) => {
    if (surgery.toLowerCase().includes('cholecyst')) return '/images/galbladderArt.svg';
    if (surgery.toLowerCase().includes('appendic')) return '/images/appendectomyArt.svg';
    if (surgery.toLowerCase().includes('inguinal')) return '/images/inguinalHerniaArt.svg';
    if (surgery.toLowerCase().includes('ventral')) return '/images/ventralHerniaArt.svg';
    return '/images/default-avatar.svg';
  };

  const tabsData = [
    { 
      id: 'overview', 
      label: 'Overview', 
      content: <OverviewTab 
        evaluation={evaluation}
        editedEvaluation={editedEvaluation}
        surgery={surgery}
        residentName={residentName}
        additionalContext={additionalContext}
        isFinalized={isFinalized}
        visualAnalysisPerformed={visualAnalysisPerformed}
        mediaUrl={mediaUrl}
        isOriginalFileVideo={isOriginalFileVideo}
      />
    },
    { 
      id: 'steps', 
      label: 'Step Analysis', 
      content: <StepsTab 
        procedureSteps={procedureSteps}
        evaluation={evaluation}
        editedEvaluation={editedEvaluation}
        isFinalized={isFinalized}
        onEvaluationChange={handleEvaluationChange}
      />
    },
    { 
      id: 'transcription', 
      label: 'Transcription', 
      content: <TranscriptionTab 
        transcription={evaluation.transcription as string}
        showTranscription={showTranscription}
        setShowTranscription={setShowTranscription}
      />
    },
    { 
      id: 'finalize', 
      label: 'Finalize', 
      content: <FinalizeTab 
        editedEvaluation={editedEvaluation}
        descriptions={descriptions}
        isFinalized={isFinalized}
        email={email}
        setEmail={setEmail}
        isSending={isSending}
        emailMessage={emailMessage}
        onOverallChange={handleOverallChange}
        onFinalize={handleFinalize}
        onSendEmail={handleSendEmail}
      />
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="glassmorphism-subtle p-4 rounded-3xl mr-4">
            <Image 
              src={getSurgeryIcon(surgery)}
              alt={surgery}
              width={48}
              height={48}
              className="opacity-90"
            />
          </div>
          <div className="glassmorphism-subtle p-3 rounded-3xl mr-4">
            <Image 
              src={visualAnalysisPerformed ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg'}
              alt={visualAnalysisPerformed ? 'Visual Analysis' : 'Audio Analysis'}
              width={32}
              height={32}
              className="opacity-80"
            />
          </div>
          <div>
            <h1 className="heading-xl text-gradient">
              {isFinalized ? 'Final Evaluation' : 'Evaluation Results'}
            </h1>
            {isFinalized && (
              <div className="status-success mt-2">
                ✓ Finalized
              </div>
            )}
          </div>
        </div>
        
        <div className="glassmorphism-subtle p-4 rounded-3xl inline-block">
          <h2 className="heading-sm mb-1">{surgery}</h2>
          {residentName && (
            <p className="text-text-tertiary">Resident: <span className="text-text-secondary font-medium">{residentName}</span></p>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <GlassTabs tabs={tabsData} defaultTab="overview" />
    </div>
  );
}

// Tab Components for the modern UI
// Tab Components for the modern UI
const OverviewTab = ({ 
  evaluation, 
  surgery, 
  residentName, 
  additionalContext, 
  isFinalized, 
  visualAnalysisPerformed, 
  mediaUrl, 
  isOriginalFileVideo 
}: any) => (
  <div className="space-y-6">
    {/* Summary Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <GlassCard variant="subtle" className="p-6 text-center">
        <h4 className="text-text-tertiary text-sm font-medium mb-2">Analysis Type</h4>
        <div className="glassmorphism-subtle p-3 rounded-xl w-fit mx-auto mb-2">
          <Image 
            src={visualAnalysisPerformed ? '/images/videoSmall.svg' : '/images/audioSmall.svg'}
            alt="Analysis type" 
            width={24} 
            height={24}
          />
        </div>
        <p className="text-text-primary font-semibold">
          {visualAnalysisPerformed ? 'Video + Audio' : 'Audio Only'}
        </p>
      </GlassCard>
      
      <GlassCard variant="subtle" className="p-6 text-center">
        <h4 className="text-text-tertiary text-sm font-medium mb-2">Case Difficulty</h4>
        <p className="text-3xl font-bold text-brand-secondary">{evaluation.caseDifficulty || 'N/A'}</p>
        <p className="text-text-quaternary text-xs mt-1">AI Assessment</p>
      </GlassCard>
      
      <GlassCard variant="subtle" className="p-6 text-center">
        <h4 className="text-text-tertiary text-sm font-medium mb-2">Status</h4>
        {isFinalized ? (
          <div className="status-success">✓ Finalized</div>
        ) : (
          <div className="status-warning">⚠ Draft</div>
        )}
      </GlassCard>
    </div>

    {/* Media Player */}
    {mediaUrl && (
      <GlassCard variant="strong" className="p-6">
        <h3 className="heading-sm mb-4">
          {isOriginalFileVideo ? 'Review Recording' : 'Listen to Recording'}
        </h3>
        <div className="glassmorphism-subtle rounded-2xl p-4">
          {isOriginalFileVideo ? (
            <video
              controls
              src={mediaUrl}
              className="w-full rounded-xl"
            >
              Your browser does not support the video tag. You can{' '}
              <a href={mediaUrl} className="text-brand-primary hover:underline">download the video</a>{' '}
              instead.
            </video>
          ) : (
            <audio
              controls
              src={mediaUrl}
              className="w-full"
            >
              Your browser does not support the audio element. You can{' '}
              <a href={mediaUrl} className="text-brand-primary hover:underline">download the audio</a>{' '}
              instead.
            </audio>
          )}
        </div>
      </GlassCard>
    )}

    {/* Procedure Info */}
    <GlassCard variant="strong" className="p-6">
      <h3 className="heading-sm mb-4">Procedure Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-text-tertiary">Surgery Type</label>
          <p className="text-text-primary font-medium mt-1">{surgery}</p>
        </div>
        {residentName && (
          <div>
            <label className="text-sm font-medium text-text-tertiary">Resident</label>
            <p className="text-text-primary font-medium mt-1">{residentName}</p>
          </div>
        )}
        {additionalContext && (
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-text-tertiary">Additional Context</label>
            <p className="text-text-secondary mt-1">{additionalContext}</p>
          </div>
        )}
      </div>
    </GlassCard>
  </div>
);

const StepsTab = ({ 
  procedureSteps, 
  evaluation, 
  editedEvaluation, 
  isFinalized, 
  onEvaluationChange 
}: any) => (
  <div className="space-y-6">
    {procedureSteps.map((step: ProcedureStep) => (
      <EnhancedEvaluationSection 
        key={step.key}
        step={step}
        aiData={evaluation[step.key] as EvaluationStep}
        editedData={editedEvaluation[step.key] as EvaluationStep}
        isFinalized={isFinalized}
        onChange={(field: string, value: string | number | undefined) => 
          onEvaluationChange(step.key, field, value)
        }
      />
    ))}
  </div>
);

const TranscriptionTab = ({ 
  transcription, 
  showTranscription, 
  setShowTranscription 
}: any) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="heading-sm">Audio Transcription</h3>
      <PillToggle
        options={[
          { id: 'hidden', label: 'Hidden' },
          { id: 'visible', label: 'Show Transcription' }
        ]}
        defaultSelected={showTranscription ? 'visible' : 'hidden'}
        onChange={(selected) => setShowTranscription(selected === 'visible')}
      />
    </div>
    
    {showTranscription ? (
      <GlassCard variant="strong" className="p-6">
        <div className="glassmorphism-subtle rounded-2xl p-6 max-h-96 overflow-y-auto scrollbar-glass">
          <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
            {transcription || 'No transcription available.'}
          </p>
        </div>
      </GlassCard>
    ) : (
      <GlassCard variant="subtle" className="p-8 text-center">
        <div className="glassmorphism-subtle p-6 rounded-2xl w-fit mx-auto mb-4">
          <Image src="/images/audioSmall.svg" alt="Audio" width={32} height={32} className="opacity-50" />
        </div>
        <p className="text-text-tertiary">Transcription is hidden</p>
        <p className="text-text-quaternary text-sm">Toggle the switch above to view the audio transcription</p>
      </GlassCard>
    )}
  </div>
);

const FinalizeTab = ({ 
  editedEvaluation, 
  descriptions, 
  isFinalized, 
  email, 
  setEmail, 
  isSending, 
  emailMessage, 
  onOverallChange, 
  onFinalize, 
  onSendEmail 
}: any) => (
  <div className="space-y-6">
    <GlassCard variant="strong" className="p-6">
      <h3 className="heading-sm mb-6">Overall Assessment</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-tertiary mb-2">
            Attending Case Difficulty (1-3)
          </label>
          <GlassInput
            type="number"
            min={1}
            max={3}
            value={editedEvaluation.attendingCaseDifficulty ?? ''}
            onChange={(e) => onOverallChange('attendingCaseDifficulty', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={isFinalized}
            placeholder={editedEvaluation.caseDifficulty?.toString() || ''}
          />
          {descriptions && editedEvaluation.attendingCaseDifficulty && (
            <p className="text-xs text-text-quaternary mt-2">
              {descriptions[editedEvaluation.attendingCaseDifficulty as keyof typeof descriptions]}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-tertiary mb-2">
            Overall Performance Score
          </label>
          <div className="glassmorphism-subtle p-4 rounded-xl text-center">
            <p className="text-2xl font-bold text-brand-secondary">
              {editedEvaluation.attendingCaseDifficulty || 'Not Set'}
            </p>
            <p className="text-xs text-text-quaternary">Final Assessment</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-text-tertiary mb-2">
          Attending Final Remarks
        </label>
        <GlassTextarea
          value={editedEvaluation.attendingAdditionalComments ?? ''}
          onChange={(e) => onOverallChange('attendingAdditionalComments', e.target.value)}
          disabled={isFinalized}
          placeholder={editedEvaluation.additionalComments as string || 'Enter your final remarks and recommendations...'}
          rows={4}
        />
      </div>
    </GlassCard>

    {/* Action Buttons */}
    <div className="space-y-4">
      {!isFinalized && (
        <GlassButton
          variant="primary"
          onClick={onFinalize}
          className="w-full"
          size="lg"
        >
          Finalize Evaluation
        </GlassButton>
      )}

      {isFinalized && (
        <GlassCard variant="subtle" className="p-6">
          <h4 className="heading-sm mb-4">Send Evaluation Report</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <GlassInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1"
            />
            <GlassButton
              variant="secondary"
              onClick={onSendEmail}
              disabled={isSending || !email}
              loading={isSending}
            >
              Send Report
            </GlassButton>
          </div>
          {emailMessage && (
            <p className="text-sm mt-3 text-text-tertiary">{emailMessage}</p>
          )}
        </GlassCard>
      )}
    </div>
  </div>
);

// Enhanced Evaluation Section Component
const EnhancedEvaluationSection = ({ 
  step, 
  aiData, 
  editedData, 
  isFinalized, 
  onChange 
}: { 
  step: ProcedureStep, 
  aiData: EvaluationStep, 
  editedData: EvaluationStep, 
  isFinalized: boolean, 
  onChange: (field: string, value: string | number | undefined) => void 
}) => {
  const [isManuallyOpened, setIsManuallyOpened] = useState(false);
  const wasPerformed = aiData && aiData.score > 0;

  if (!wasPerformed && !isManuallyOpened) {
    return (
      <GlassCard variant="subtle" className="p-6">
        <h3 className="heading-sm mb-4">{step.name}</h3>
        <div className="glassmorphism-subtle rounded-2xl p-4 mb-4">
          <p className="text-text-tertiary italic">
            {aiData?.comments || "This step was not performed or mentioned in the provided transcript."}
          </p>
        </div>
        {!isFinalized && (
          <GlassButton
            variant="ghost"
            onClick={() => setIsManuallyOpened(true)}
            size="sm"
          >
            Manually Evaluate Step
          </GlassButton>
        )}
      </GlassCard>
    );
  }
  
  return (
    <GlassCard variant="strong" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-sm">{step.name}</h3>
        <div className="glassmorphism-subtle px-3 py-1 rounded-xl">
          <span className="text-xs text-text-tertiary">Goal: {step.goalTime}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Assessment */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-text-tertiary">AI Assessment</h4>
          
          <div className="glassmorphism-subtle rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-tertiary">Performance Score</span>
              <span className="text-lg font-bold text-brand-secondary">
                {wasPerformed ? `${aiData.score}/5` : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-tertiary">Time Taken</span>
              <span className="text-sm font-medium text-text-primary">{aiData.time || 'N/A'}</span>
            </div>
            
            <div>
              <span className="text-sm text-text-tertiary">AI Comments</span>
              <p className="text-sm text-text-secondary mt-1">
                {wasPerformed ? aiData.comments : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Attending Assessment */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-text-tertiary">Attending Assessment</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Score (0-5)</label>
              <GlassInput
                type="number"
                min={0}
                max={5}
                value={editedData.attendingScore?.toString() ?? ''}
                onChange={(e) => onChange('attendingScore', e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={isFinalized}
                placeholder={aiData.score > 0 ? aiData.score.toString() : '0'}
              />
            </div>
            
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Time Taken</label>
              <GlassInput
                type="text"
                value={editedData.attendingTime ?? ''}
                onChange={(e) => onChange('attendingTime', e.target.value)}
                disabled={isFinalized}
                placeholder={aiData.time || 'Enter time'}
              />
            </div>
            
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Comments</label>
              <GlassTextarea
                value={editedData.attendingComments ?? ''}
                onChange={(e) => onChange('attendingComments', e.target.value)}
                disabled={isFinalized}
                placeholder={aiData.comments || 'Enter your comments...'}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};