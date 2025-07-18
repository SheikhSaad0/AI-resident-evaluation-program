import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GlassCard, GlassButton, GlassInput, GlassTextarea } from '../../components/ui';
// --- FIX: Import shared configurations instead of defining them locally ---
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

// --- TYPE DEFINITIONS ---
interface EvaluationStep {
  score: number;
  time: string;
  comments: string;
  attendingScore?: number;
  attendingComments?: string;
  attendingTime?: string;
}

interface EvaluationData {
  [key: string]: EvaluationStep | number | string | boolean | undefined;
  id?: string;
  caseDifficulty: number;
  additionalComments: string;
  attendingCaseDifficulty?: number;
  attendingAdditionalComments?: string;
  transcription: string;
  surgery: string; // This is the full name, e.g., "Laparoscopic Cholecystectomy"
  residentId?: string;
  residentName?: string;
  residentPhotoUrl?: string;
  residentEmail?: string;
  additionalContext?: string;
  isFinalized?: boolean;
  finalScore?: number;
  date: string;
}

interface ProcedureStep {
  key: string;
  name: string;
}

// Helper to get the correct surgery icon based on name
const getSurgeryIcon = (s: string) => {
    if (!s) return '/images/default-avatar.svg';
    const lowerCaseSurgery = s.toLowerCase();
    if (lowerCaseSurgery.includes('cholecyst')) return '/Images/galbladderArt.png';
    if (lowerCaseSurgery.includes('appendic')) return '/Images/appendectomyArt.png';
    if (lowerCaseSurgery.includes('hernia')) return '/Images/herniaArt.png';
    return '/images/default-avatar.svg';
};


// --- UI COMPONENTS (UNCHANGED) ---

const ScoreRing = ({ score, max = 5 }: { score: number; max?: number }) => {
    const percentage = (score / max) * 100;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    const getColor = (s: number) => s < 3 ? '#FF3B30' : s < 4 ? '#FF9500' : '#34C759';

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className="text-glass-200" strokeWidth="10" fill="none" stroke="currentColor"/>
                <circle
                    cx="50" cy="50" r="45"
                    stroke={getColor(score)} strokeWidth="10" fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-1000 ease-in-out"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{score.toFixed(1)}</span>
                <span className="text-xs text-text-quaternary">/ {max}.0</span>
            </div>
        </div>
    );
};

const InfoWidget = ({ title, value, icon }: { title: string, value: string | number, icon: string }) => (
    <GlassCard variant="subtle" className="p-4 flex-1">
        <div className="flex items-center space-x-4">
            <div className="relative w-10 h-10">
                <Image src={icon} alt={title} layout="fill" objectFit="contain" />
            </div>
            <div>
                <p className="text-sm text-text-quaternary">{title}</p>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
            </div>
        </div>
    </GlassCard>
);

const StepAssessmentWidget = ({ stepName, score, comments }: { stepName: string; score: number; comments: string }) => {
    const wasPerformed = score > 0;
    return (
        <GlassCard variant="subtle" className="p-4">
            <div className="flex items-start gap-4">
                {wasPerformed && <ScoreRing score={score} />}
                <div className="flex-1">
                    <h4 className="font-semibold text-text-primary mb-2">{stepName}</h4>
                    <p className="text-sm text-text-tertiary leading-relaxed">
                        {wasPerformed ? comments : "This step was not performed or mentioned."}
                    </p>
                </div>
            </div>
        </GlassCard>
    );
};

const PillTabs = ({ tabs, activeTab, setActiveTab }: { tabs: any[], activeTab: string, setActiveTab: (id: string) => void }) => (
    <div className="flex items-center gap-3">
        {tabs.map(tab => (
            <GlassButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="md"
                className="flex-1"
            >
                {tab.label}
            </GlassButton>
        ))}
    </div>
);


// --- FIXED SIDEBAR & TABS ---

const LeftSidebar = ({ evaluation }: { evaluation?: EvaluationData | null }) => {
    const surgery = evaluation?.surgery;
    const finalScore = evaluation?.finalScore;
    const caseDifficulty = evaluation?.attendingCaseDifficulty ?? evaluation?.caseDifficulty;
    
    let displayScore = finalScore;
    // Calculate average score only if no final score is set
    if (finalScore === undefined && evaluation && surgery) {
        // --- FIX: Find the config by matching the surgery name, not using it as a key ---
        const config = Object.values(EVALUATION_CONFIGS).find(c => c.name === surgery);
        
        if (config) {
            const stepScores = config.procedureSteps
                .map(step => (evaluation[step.key] as EvaluationStep)?.score)
                .filter(score => typeof score === 'number' && score > 0);
            
            if (stepScores.length > 0) {
                displayScore = stepScores.reduce((a, b) => a + b, 0) / stepScores.length;
            }
        }
    }

    return (
        <div className="flex flex-col items-center justify-start h-full p-6 text-center">
            <h1 className="heading-lg text-text-primary mb-6">{surgery || 'Loading Evaluation...'}</h1>
            
            <div className="relative w-56 h-56 my-6">
                <Image src={getSurgeryIcon(surgery || '')} alt={surgery || 'Loading'} layout="fill" objectFit="contain"/>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6 w-full max-w-sm">
                {displayScore !== undefined && (
                    <InfoWidget title="Overall Score" value={`${displayScore.toFixed(1)}/5`} icon="/images/eval-image.svg" />
                )}
                {caseDifficulty !== undefined && (
                    <InfoWidget title="Case Difficulty" value={`${caseDifficulty}/3`} icon="/images/difficulty-icon.svg" />
                )}
            </div>
        </div>
    );
};

const OverviewTab = ({ evaluation }: { evaluation: EvaluationData }) => {
    // --- FIX: Find the config by matching the surgery name ---
    const config = Object.values(EVALUATION_CONFIGS).find(c => c.name === evaluation.surgery);

    if (!config) {
        return <p>Could not find configuration for {evaluation.surgery}.</p>;
    }

    return (
        <div className="space-y-6">
            <GlassCard variant="strong" className="p-6">
                <h3 className="heading-md mb-4">Overall Remarks</h3>
                <p className="text-text-secondary leading-relaxed">{evaluation.attendingAdditionalComments || evaluation.additionalComments}</p>
                {evaluation.additionalContext && (
                     <div className="mt-4">
                        <h4 className="font-semibold text-text-tertiary mb-2">Provided Context</h4>
                        <p className="text-text-quaternary text-sm italic">"{evaluation.additionalContext}"</p>
                    </div>
                )}
            </GlassCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {config.procedureSteps.map(step => {
                    const stepData = evaluation[step.key] as EvaluationStep | undefined;
                    // Use a default score of 0 if the step data is missing
                    const displayScore = stepData?.attendingScore ?? stepData?.score ?? 0;
                    const displayComments = stepData?.attendingComments || stepData?.comments || 'No comments available.';

                    return (
                        <StepAssessmentWidget 
                            key={step.key}
                            stepName={step.name}
                            score={displayScore}
                            comments={displayComments}
                        />
                    );
                 })}
            </div>
        </div>
    );
};


// --- OTHER TABS & MAIN PAGE (LOGIC REMAINS MOSTLY THE SAME) ---

const StepAnalysisTab = ({ procedureSteps, editedEvaluation, isFinalized, onEvaluationChange }: { procedureSteps: ProcedureStep[], editedEvaluation: EvaluationData, isFinalized: boolean, onEvaluationChange: Function }) => (
    <div className="space-y-6">
      {procedureSteps.map((step: ProcedureStep) => {
        const aiData = editedEvaluation[step.key] as EvaluationStep;
        return (
            <GlassCard key={step.key} variant="strong" className="p-6">
                <h3 className="heading-md mb-6">{step.name}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-text-tertiary">AI Assessment</h4>
                        <GlassCard variant="subtle" className="p-4 space-y-3">
                            <div><span className="text-sm text-text-tertiary">Score:</span><span className="text-lg font-bold text-brand-secondary ml-2">{aiData?.score > 0 ? `${aiData.score}/5` : 'N/A'}</span></div>
                            <div><span className="text-sm text-text-tertiary">Time:</span><span className="text-sm font-medium text-text-primary ml-2">{aiData?.time || 'N/A'}</span></div>
                            <div><span className="text-sm text-text-tertiary">Comments:</span><p className="text-sm text-text-secondary mt-1">{aiData?.comments || 'N/A'}</p></div>
                        </GlassCard>
                    </div>
                     <div className="space-y-3">
                        <h4 className="text-sm font-medium text-text-tertiary">Attending Overrides</h4>
                        <div>
                            <label className="block text-xs text-text-tertiary mb-1">Score (0-5)</label>
                            <GlassInput type="number" min={0} max={5} value={aiData?.attendingScore?.toString() ?? ''} onChange={(e) => onEvaluationChange(step.key, 'attendingScore', e.target.value ? parseInt(e.target.value) : undefined)} disabled={isFinalized} placeholder={aiData?.score > 0 ? aiData.score.toString() : '0'} />
                        </div>
                        <div>
                            <label className="block text-xs text-text-tertiary mb-1">Time</label>
                            <GlassInput type="text" value={aiData?.attendingTime ?? ''} onChange={(e) => onEvaluationChange(step.key, 'attendingTime', e.target.value)} disabled={isFinalized} placeholder={aiData?.time || 'Enter time'} />
                        </div>
                        <div>
                            <label className="block text-xs text-text-tertiary mb-1">Comments</label>
                            <GlassTextarea value={aiData?.attendingComments ?? ''} onChange={(e) => onEvaluationChange(step.key, 'attendingComments', e.target.value)} disabled={isFinalized} placeholder={aiData?.comments || 'Enter comments...'} rows={3} />
                        </div>
                    </div>
                </div>
            </GlassCard>
        );
      })}
    </div>
  );

const MediaTab = ({ transcription, mediaUrl, isOriginalFileVideo }: { transcription: string, mediaUrl: string | null, isOriginalFileVideo: boolean }) => (
    <div className="space-y-6">
        {mediaUrl && (
            <GlassCard variant="strong" className="p-6">
                <h3 className="heading-md mb-4">{isOriginalFileVideo ? 'Video Recording' : 'Audio Recording'}</h3>
                <div className="glassmorphism-subtle rounded-2xl p-2">
                    {isOriginalFileVideo ? (<video controls src={mediaUrl} className="w-full rounded-xl" />) : (<audio controls src={mediaUrl} className="w-full" />)}
                </div>
            </GlassCard>
        )}
        <GlassCard variant="strong" className="p-6">
            <h3 className="heading-md mb-4">Transcription</h3>
            <div className="glassmorphism-subtle rounded-2xl p-6 max-h-[60vh] overflow-y-auto scrollbar-glass">
                <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{transcription || 'No transcription available.'}</p>
            </div>
        </GlassCard>
    </div>
);

const EditTab = ({ editedEvaluation, isFinalized, onOverallChange, onFinalize, onDelete, onEdit }: { editedEvaluation: EvaluationData, isFinalized: boolean, onOverallChange: Function, onFinalize: () => void, onDelete: () => void, onEdit: () => void }) => (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <h3 className="heading-md mb-6">Attending Final Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-tertiary mb-2">Case Difficulty Override (1-3)</label>
              <GlassInput type="number" min={1} max={3} value={editedEvaluation.attendingCaseDifficulty?.toString() ?? ''} onChange={(e) => onOverallChange('attendingCaseDifficulty', e.target.value ? parseInt(e.target.value) : undefined)} disabled={isFinalized} placeholder={`AI rated: ${editedEvaluation.caseDifficulty}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-tertiary mb-2">Final Overall Score (1-5)</label>
              <GlassInput type="number" min={1} max={5} step="0.1" value={editedEvaluation.finalScore?.toString() ?? ''} onChange={(e) => onOverallChange('finalScore', e.target.value ? parseFloat(e.target.value) : undefined)} disabled={isFinalized} placeholder="Required to finalize" />
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-text-tertiary mb-2">Final Remarks & Recommendations</label>
            <GlassTextarea value={editedEvaluation.attendingAdditionalComments ?? ''} onChange={(e) => onOverallChange('attendingAdditionalComments', e.target.value)} disabled={isFinalized} placeholder={editedEvaluation.additionalComments as string || 'Enter your final remarks...'} rows={5} />
          </div>
      </GlassCard>
      <div className="flex flex-col sm:flex-row gap-4">
        {isFinalized ? (
            <GlassButton variant="secondary" onClick={onEdit} size="lg" className="flex-1">Unlock to Edit</GlassButton>
        ) : (
            <GlassButton variant="primary" onClick={onFinalize} size="lg" className="flex-1" disabled={editedEvaluation.finalScore === undefined}>Finalize & Lock</GlassButton>
        )}
         <GlassButton variant="ghost" onClick={onDelete} className="flex-1 !text-red-400 hover:!bg-red-500/20" size="lg">Delete Evaluation</GlassButton>
      </div>
    </div>
  );


export default function RevampedResultsPage() {
    const router = useRouter();
    const { id } = router.query;
    const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
    const [editedEvaluation, setEditedEvaluation] = useState<EvaluationData | null>(null);
    const [status, setStatus] = useState<'loading' | 'polling' | 'error' | 'loaded'>('loading');
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [isOriginalFileVideo, setIsOriginalFileVideo] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!id || typeof id !== 'string') return;

        const fetchEvaluation = async (jobId: string) => {
            try {
                const response = await fetch(`/api/job-status/${jobId}`);
                if (!response.ok) throw new Error('Network response was not ok.');
                
                const jobData = await response.json();
    
                if (jobData.status === 'complete' && jobData.result) {
                    // --- FIX: The result from the API might be a string, ensure it's parsed ---
                    const resultData = typeof jobData.result === 'string' ? JSON.parse(jobData.result) : jobData.result;

                    // Validate that the essential data is present before proceeding
                    if (!resultData.surgery || !resultData.procedureSteps) {
                         throw new Error('Incomplete evaluation data received from the server.');
                    }
                    
                    const residentResponse = await fetch(`/api/residents/${jobData.residentId}`);
                    const residentData = residentResponse.ok ? await residentResponse.json() : {};
                    
                    const parsedData: EvaluationData = {
                        ...resultData,
                        id: jobData.id,
                        residentId: jobData.residentId,
                        residentName: residentData.name,
                        residentPhotoUrl: residentData.photoUrl,
                        residentEmail: residentData.email,
                        date: jobData.createdAt
                    };
    
                    setEvaluation(parsedData);
                    setEditedEvaluation(JSON.parse(JSON.stringify(parsedData)));
                    setIsOriginalFileVideo(jobData.withVideo);
                    if (jobData.readableUrl) setMediaUrl(jobData.readableUrl);
                    setStatus('loaded');
                } else if (jobData.status === 'pending' || jobData.status.startsWith('processing')) {
                    setStatus('polling');
                    // Continue polling
                    setTimeout(() => fetchEvaluation(jobId), 5000);
                } else {
                    // Handle failed or errored jobs
                    throw new Error(jobData.error || 'Evaluation has failed or the job was not found.');
                }
            } catch (error) {
                console.error("Failed to fetch or process evaluation data:", error);
                setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
                setStatus('error');
            }
        };

        fetchEvaluation(id as string);
    }, [id]);
  
    // --- HANDLER FUNCTIONS (UNCHANGED) ---
    const handleFinalize = async () => {
        if (!editedEvaluation || !id) return;
        const finalEvaluation = { ...editedEvaluation, isFinalized: true };
        try {
          const response = await fetch(`/api/evaluations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updatedEvaluation: finalEvaluation }) });
          if (!response.ok) throw new Error((await response.json()).message || 'Failed to finalize.');
          setEvaluation(finalEvaluation);
          setEditedEvaluation(finalEvaluation);
          alert('Evaluation has been finalized!');
        } catch (error) {
          alert(`Finalization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    const handleEdit = async () => {
        if (!editedEvaluation || !id || !window.confirm('Are you sure you want to unlock this evaluation?')) return;
        
        const unlockedEvaluation = { ...editedEvaluation, isFinalized: false };
    
        try {
            const response = await fetch(`/api/evaluations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updatedEvaluation: unlockedEvaluation })
            });
    
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to unlock.');
    
            setEvaluation(unlockedEvaluation);
            setEditedEvaluation(unlockedEvaluation);
            alert('Evaluation unlocked for editing.');
    
        } catch (error) {
            alert(`Unlocking error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDelete = async () => {
        if (!id || !window.confirm('Are you sure you want to delete this evaluation? This action cannot be undone.')) return;
        try {
          const response = await fetch(`/api/evaluations/${id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete.');
          alert('Evaluation deleted successfully.');
          router.push('/evaluations');
        } catch (error) {
          alert(`Deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
  
    const handleEvaluationChange = (stepKey: string, field: string, value: string | number | undefined) => {
        setEditedEvaluation(prev => {
            if (!prev) return null;
            const currentStep = prev[stepKey] as EvaluationStep | undefined;
            if (typeof currentStep !== 'object' || currentStep === null) return prev;
            const updatedStep = { ...currentStep, [field]: value };
            return { ...prev, [stepKey]: updatedStep };
        });
    };
  
    const handleOverallChange = (field: string, value: string | number | undefined) => {
        if (editedEvaluation) setEditedEvaluation({ ...editedEvaluation, [field]: value });
    };

    // --- RENDER LOGIC ---

    if (status === 'error') {
        return (
          <div className="min-h-screen flex items-center justify-center text-center">
            <GlassCard variant="strong" className="p-8">
              <h2 className="heading-md text-red-400 mb-2">Error</h2>
              <p className="text-text-tertiary mb-4">Could not load the evaluation data.</p>
              {errorMessage && <p className="text-sm text-text-quaternary bg-glass-subtle p-2 rounded-md">Details: {errorMessage}</p>}
              <GlassButton onClick={() => router.push('/evaluations')} className="mt-6">Back to Evaluations</GlassButton>
            </GlassCard>
          </div>
        );
    }
    
    // --- FIX: Find the config by matching the surgery name for tab generation ---
    const config = evaluation ? Object.values(EVALUATION_CONFIGS).find(c => c.name === evaluation.surgery) : null;
    const isFinalizedAndLocked = editedEvaluation?.isFinalized === true;

    const tabs = editedEvaluation && config ? [
        { id: 'overview', label: 'Overview', content: <OverviewTab evaluation={editedEvaluation} /> },
        { id: 'step_analysis', label: 'Step Analysis', content: <StepAnalysisTab procedureSteps={config.procedureSteps} editedEvaluation={editedEvaluation} isFinalized={isFinalizedAndLocked} onEvaluationChange={handleEvaluationChange} /> },
        { id: 'media', label: 'Media & Transcription', content: <MediaTab transcription={editedEvaluation.transcription} mediaUrl={mediaUrl} isOriginalFileVideo={isOriginalFileVideo} /> },
        { id: 'edit', label: 'Edit & Finalize', content: <EditTab editedEvaluation={editedEvaluation} isFinalized={isFinalizedAndLocked} onOverallChange={handleOverallChange} onFinalize={handleFinalize} onDelete={handleDelete} onEdit={handleEdit} /> },
    ] : [];
    
    const activeTabContent = editedEvaluation ? tabs.find(tab => tab.id === activeTab)?.content : null;

    const getStatusComponent = () => {
        let text;
        let className = 'status-chip';

        if (status === 'loading' || status === 'polling') {
            text = 'In Progress';
            className += ' status-warning';
        } else if (isFinalizedAndLocked) {
            text = '✓ Finalized';
            className += ' status-success';
        } else {
            text = '⚠ Draft';
            className += ' status-warning';
        }

        return <div className={className}>{text}</div>;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 h-full p-4 md:p-6">
            <div className="lg:col-span-1 xl:col-span-1">
                <LeftSidebar evaluation={editedEvaluation} />
            </div>
    
            <div className="lg:col-span-2 xl:col-span-3 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <GlassButton
                            variant="secondary"
                            onClick={() => router.back()}
                            className="!rounded-full !p-3.5"
                        >
                           <Image src="/images/arrow-left-icon.svg" alt="Back" width={20} height={20} />
                        </GlassButton>
                    </div>
                    
                    <div className="flex-1 flex justify-center">
                        {getStatusComponent()}
                    </div>
                    
                    <div className="flex-1 flex justify-end">
                        {evaluation?.residentId && evaluation?.residentPhotoUrl && (
                             <Link href={`/residents/${evaluation.residentId}`} passHref legacyBehavior>
                                <a className="block glassmorphism p-1 rounded-full hover:shadow-glass-lg transition-shadow">
                                     <div className="w-12 h-12 rounded-full overflow-hidden relative">
                                        <Image 
                                            src={evaluation.residentPhotoUrl} 
                                            alt={evaluation.residentName || 'Resident'}
                                            layout="fill"
                                            objectFit="cover"
                                        />
                                     </div>
                                </a>
                            </Link>
                        )}
                    </div>
                </div>

                {editedEvaluation && config ? (
                    <>
                        <PillTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
                        <div>
                            {activeTabContent}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col justify-center items-center h-96">
                        <div className="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-text-secondary">Loading evaluation...</p>
                    </div>
                )}
            </div>
        </div>
    );
}