// pages/residents/[id].tsx
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, PerformanceChart, StatCard, GlassInput, ImageUpload, CaseTimeWidget, ImprovementWidget } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

// --- TYPE DEFINITIONS ---
interface Resident {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  company: string | null;
  year: string | null;
  medicalSchool: string | null;
  createdAt: string;
}

interface Evaluation {
  id: string;
  surgery: string;
  date: string;
  score?: number;
  type: 'video' | 'audio';
  status: string;
  isFinalized?: boolean;
  result?: any;
  audioDuration?: number;
}

type TimeRange = 'all' |'week' | 'month' | '6M' | '1Y';

interface EditResidentModalProps {
    resident: Resident;
    onClose: () => void;
    onSave: (resident: Resident) => Promise<void>;
}

// Interfaces for our new calculation to solve TS errors
interface RecentEvalData {
    date: number;
    score: number;
    difficulty: number;
}

interface WeightedScoreData {
    x: number; // date as timestamp
    y: number; // weighted score
}


// Helper function to parse time strings like "X minutes Y seconds" into total minutes
const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr || timeStr === 'N/A') return 0;
    const parts = timeStr.toLowerCase().split(' ');
    let minutes = 0;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'minutes' || parts[i] === 'minute') {
            minutes += parseInt(parts[i - 1], 10);
        }
        if (parts[i] === 'seconds' || parts[i] === 'second') {
            minutes += parseInt(parts[i - 1], 10) / 60;
        }
    }
    return minutes;
};

const EditResidentModal = ({ resident, onClose, onSave }: EditResidentModalProps) => {
    const [editedResident, setEditedResident] = useState(resident);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedResident(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (url: string) => {
        setEditedResident(prev => ({ ...prev, photoUrl: url }));
    };

    const handleSave = async () => {
        await onSave(editedResident);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <GlassCard variant="strong" className="p-8 w-full max-w-md">
                <h2 className="heading-md mb-6">Edit Resident</h2>
                <div className="space-y-4">
                    <ImageUpload value={editedResident.photoUrl || undefined} onChange={handlePhotoChange} />
                    <GlassInput name="name" value={editedResident.name} onChange={handleChange} placeholder="Name" />
                    <GlassInput name="email" value={editedResident.email || ''} onChange={handleChange} placeholder="Email" />
                    <GlassInput name="company" value={editedResident.company || ''} onChange={handleChange} placeholder="Institution" />
                    <GlassInput name="year" value={editedResident.year || ''} onChange={handleChange} placeholder="Training Year" />
                    <GlassInput name="medicalSchool" value={editedResident.medicalSchool || ''} onChange={handleChange} placeholder="Medical School" />
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
                    <GlassButton variant="primary" onClick={handleSave}>Save</GlassButton>
                </div>
            </GlassCard>
        </div>
    );
};


export default function ResidentProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { apiFetch } = useApi();
  const [resident, setResident] = useState<Resident | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalEvaluations: 0, avgScore: 0, completedEvaluations: 0, improvement: 0, averageCaseTime: 0 });
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchResidentData = async () => {
        setLoading(true);
        try {
            const residentData = await apiFetch(`/api/residents/${id}`);
            setResident(residentData);

            const evalsData = await apiFetch(`/api/residents/${id}/evaluations`);
            setEvaluations(evalsData);

            const finalizedEvals = evalsData.filter((e: Evaluation) => e.isFinalized && e.score !== undefined);
            const avgScore = finalizedEvals.length > 0 ? finalizedEvals.reduce((acc: number, e: Evaluation) => acc + (e.score || 0), 0) / finalizedEvals.length : 0;

            // --- DEBUGGING CALCULATION ---
            console.log("Starting case time calculation for resident:", id);
            console.log("Finalized evaluations to process:", finalizedEvals);

            let totalDifference = 0;
            let caseCount = 0;
            finalizedEvals.forEach((e: Evaluation, index: number) => {
                console.log(`\n--- Processing Eval #${index + 1} (ID: ${e.id}) ---`);
                console.log("Evaluation data:", e);

                const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === e.surgery);

                if (procedureId && e.result) {
                    console.log("Found procedure config and result object.");
                    const config = EVALUATION_CONFIGS[procedureId];

                    const caseDifficulty = e.result?.attendingCaseDifficulty ?? e.result?.caseDifficulty ?? 1;
                    const difficultyMultiplier: { [key: number]: number } = { 1: 0.75, 2: 0.85, 3: 1 };
                    const totalEstimatedTime = config.procedureSteps.reduce((acc, step) => acc + (step.estimatedTime || 0), 0);
                    const scheduledTime = (totalEstimatedTime * (difficultyMultiplier[caseDifficulty] || 1)) + 10;
                    console.log(`Scheduled Time: ${scheduledTime.toFixed(2)} mins (Estimated: ${totalEstimatedTime}, Difficulty: ${caseDifficulty})`);


                    let actualTime = e.audioDuration ? e.audioDuration / 60 : 0;
                    console.log(`Actual time from audioDuration: ${actualTime.toFixed(2)} mins`);

                    if (actualTime === 0) {
                        console.log("audioDuration is zero, falling back to step times.");
                        config.procedureSteps.forEach(step => {
                            const stepData = e.result[step.key];
                            if (stepData && stepData.time) {
                                const stepMinutes = parseTimeToMinutes(stepData.time);
                                actualTime += stepMinutes;
                                console.log(`  - Step '${step.key}': ${stepData.time} (${stepMinutes.toFixed(2)} mins) -> Total actualTime now: ${actualTime.toFixed(2)}`);
                            }
                        });
                    }

                    console.log(`Final Actual Time: ${actualTime.toFixed(2)} mins`);

                    if (actualTime > 0) {
                        totalDifference += actualTime - scheduledTime;
                        caseCount++;
                        console.log("SUCCESS: Actual time is > 0. Incrementing caseCount. New count:", caseCount);
                    } else {
                        console.log("SKIPPING: Actual time is 0, not counting this evaluation.");
                    }

                } else {
                    console.log("SKIPPING: Evaluation is missing procedureId or result object.");
                }
            });

            const averageCaseTimeDifference = caseCount > 0 ? totalDifference / caseCount : 0;
            console.log("\n--- Final Calculation ---");
            console.log("Total Cases Counted:", caseCount);
            console.log("Average Case Time Difference:", averageCaseTimeDifference.toFixed(2));
            // --- END DEBUGGING ---

            // --- NEW IMPROVEMENT CALCULATION ---
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

            const recentEvals: RecentEvalData[] = finalizedEvals
                .filter((e: Evaluation) => new Date(e.date) >= twoWeeksAgo)
                .map((e: Evaluation) => ({
                    date: new Date(e.date).getTime(),
                    score: e.score || 0,
                    difficulty: e.result?.attendingCaseDifficulty || e.result?.caseDifficulty || 2,
                }))
                .sort((a: RecentEvalData, b: RecentEvalData) => a.date - b.date); // FIX: Add types for sort

            let improvement = 0;
            if (recentEvals.length > 1) {
                const difficultyMultiplier: { [key: number]: number } = { 1: 0.8, 2: 1.0, 3: 1.2 };

                const weightedScores: WeightedScoreData[] = recentEvals.map((e: RecentEvalData) => ({ // FIX: Add type for map
                    x: e.date,
                    y: e.score * (difficultyMultiplier[e.difficulty] || 1),
                }));

                // Simple linear regression
                let sx = 0, sy = 0, sxy = 0, sxx = 0;
                const n = weightedScores.length;
                weightedScores.forEach(({ x, y }: WeightedScoreData) => { // FIX: Add type for forEach
                    sx += x;
                    sy += y;
                    sxy += x * y;
                    sxx += x * x;
                });

                const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
                
                if (!isNaN(slope)) {
                    const firstDate = weightedScores[0].x;
                    const lastDate = weightedScores[n - 1].x;
                    const timeDiff = lastDate - firstDate;

                    if (timeDiff > 0) {
                        const predictedChange = slope * timeDiff;
                        // FIX: Add types for reduce
                        const avgWeightedScore = weightedScores.reduce((acc: number, p: WeightedScoreData) => acc + p.y, 0) / n;
                        if (avgWeightedScore > 0) {
                            improvement = (predictedChange / avgWeightedScore) * 100;
                        }
                    }
                }
            }
            // --- END IMPROVEMENT CALCULATION ---

            setStats({
              totalEvaluations: evalsData.length,
              avgScore: avgScore,
              completedEvaluations: finalizedEvals.length,
              improvement: improvement, 
              averageCaseTime: averageCaseTimeDifference,
            });

        } catch (error) {
            console.error(error);
            setResident(null);
        } finally {
            setLoading(false);
        }
    };


    fetchResidentData();
  }, [id, apiFetch]);

  const handleSaveResident = async (updatedResident: Resident) => {
    if (!id || typeof id !== 'string') return;
    try {
        const data = await apiFetch(`/api/residents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedResident),
        });
        setResident(data);
    } catch (error) {
        console.error(error);
    }
  };


  const getSurgeryIcon = (surgery: string) => {
    if (surgery.toLowerCase().includes('cholecyst')) return '/images/galbladderArt.png';
    if (surgery.toLowerCase().includes('appendic')) return '/images/appendectomyArt.png';
    if (surgery.toLowerCase().includes('inguinal')) return '/images/herniaArt.png';
    if (surgery.toLowerCase().includes('ventral')) return '/images/herniaArt.png';
    return '/images/default-avatar.svg';
  };

  const getTypeIcon = (type: string) => (type === 'video' ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg');
  const getStatusBadge = (evaluation: Evaluation) => {
    if (evaluation.isFinalized) {
      return 'status-success';
    }
    if (evaluation.status.startsWith('processing') || evaluation.status === 'in-progress' || evaluation.status === 'pending') {
        return 'status-warning';
    }
    if (evaluation.status === 'failed') {
        return 'status-error';
    }
    if (evaluation.status === 'complete' || evaluation.status === 'completed') {
        return 'status-info';
    }
    return 'status-info';
  };

  const getStatusText = (evaluation: Evaluation) => {
    if (evaluation.isFinalized) return 'Finalized';
    if (evaluation.status === 'complete' || evaluation.status === 'completed') return 'Draft';
    if (evaluation.status.startsWith('processing') || evaluation.status === 'in-progress' || evaluation.status === 'pending') return 'In Progress';
    if (evaluation.status === 'failed') return 'Failed';
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-text-tertiary">Loading resident profile...</p></div>
      </div>
    );
  }

  if (!resident) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center"><h2 className="heading-md text-red-400">Error</h2><p className="text-text-tertiary">Could not load resident profile.</p><GlassButton variant="secondary" onClick={() => router.push('/residents')} className="mt-4">Back to Residents</GlassButton></div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {isEditModalOpen && resident && <EditResidentModal resident={resident} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveResident} />}
      <div className="flex items-center justify-between">
        <GlassButton variant="ghost" onClick={() => router.back()}>← Back</GlassButton>
        <a href={`/evaluations?resident=${resident.id}`} target="_blank" rel="noopener noreferrer">
          <GlassButton variant="secondary">View All Evaluations</GlassButton>
        </a>
      </div>
      <GlassCard variant="strong" className="p-8 relative">
        <GlassButton variant="ghost" onClick={() => setIsEditModalOpen(true)} className="absolute top-4 right-4 !p-2">
            <Image src="/images/editBtn.svg" alt="Edit" width={24} height={24} />
        </GlassButton>
        <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">

        <div className="glassmorphism-subtle p-2 rounded-full">
          <div className="w-[120px] h-[120px] rounded-full overflow-hidden">
            <Image
              src={resident.photoUrl || '/images/default-avatar.svg'}
              alt={resident.name}
              width={120}
              height={120}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/default-avatar.svg';
              }}
            />
          </div>
       </div>


          <div className="flex-1">
            <h1 className="heading-xl text-gradient mb-2">{resident.name}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text-secondary">
              <div><p className="text-sm text-text-quaternary mb-1">Institution</p><p className="font-medium">{resident.company || 'N/A'}</p></div>
              <div><p className="text-sm text-text-quaternary mb-1">Training Year</p><p className="font-medium">{resident.year || 'N/A'}</p></div>
              <div><p className="text-sm text-text-quaternary mb-1">Medical School</p><p className="font-medium">{resident.medicalSchool || 'N/A'}</p></div>
              <div><p className="text-sm text-text-quaternary mb-1">Email</p><p className="font-medium">{resident.email || 'N/A'}</p></div>
              <div><p className="text-sm text-text-quaternary mb-1">Start Date</p><p className="font-medium">{new Date(resident.createdAt).toLocaleDateString()}</p></div>
            </div>
          </div>
        </div>
      </GlassCard>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Evaluations" value={stats.totalEvaluations} icon="/images/eval-count-icon.svg" />
        <StatCard title="Average Score" value={`${stats.avgScore.toFixed(1)}/5.0`} icon="/images/avg-score-icon.svg" />
        <StatCard title="Finalized Evals" value={stats.completedEvaluations} icon="/images/eval-count-icon.svg" />
        <ImprovementWidget improvement={stats.improvement} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <GlassCard variant="strong" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md">Performance Over Time</h3>
              <div className="flex space-x-2">
                <GlassButton variant={timeRange === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('all')}>All</GlassButton>
                <GlassButton variant={timeRange === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('week')}>Week</GlassButton>
                <GlassButton variant={timeRange === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('month')}>Month</GlassButton>
                <GlassButton variant={timeRange === '6M' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('6M')}>6M</GlassButton>
                <GlassButton variant={timeRange === '1Y' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('1Y')}>1Y</GlassButton>
              </div>
            </div>
            <div className="h-64">
              <PerformanceChart evaluations={evaluations} timeRange={timeRange} height={240} />
            </div>
          </GlassCard>
        </div>
        <div className="xl:col-span-1">
            <CaseTimeWidget averageCaseTime={stats.averageCaseTime} timeRange={timeRange} />
        </div>
        <div className="xl:col-span-2"><GlassCard variant="strong" className="p-6"><div className="flex items-center justify-between mb-6"><h3 className="heading-md">Recent Evaluations</h3><GlassButton variant="primary" size="sm" onClick={() => router.push('/')}>New Evaluation</GlassButton></div>
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-glass">
              {evaluations.length > 0 ? evaluations.map((evaluation) => (
                <GlassCard key={evaluation.id} variant="subtle" hover onClick={() => router.push(`/results/${evaluation.id}`)} className="p-4 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0"><Image src={getSurgeryIcon(evaluation.surgery)} alt={evaluation.surgery} width={32} height={32} className="opacity-80" /></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-primary truncate">{evaluation.surgery}</h4>
                      <div className="flex items-center space-x-2 text-xs text-text-tertiary"><span>{evaluation.date}</span><span className={`${getStatusBadge(evaluation)}`}>{getStatusText(evaluation)}</span></div>
                      {evaluation.score !== undefined && (
                        <div className="flex items-center space-x-1 mt-1">
                          {[...Array(5)].map((_, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.floor(evaluation.score!) ? 'bg-brand-secondary' : 'bg-glass-300'}`} />))}
                          <span className="text-xs text-text-quaternary ml-1">{evaluation.score.toFixed(1)}/5</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0"><Image src={getTypeIcon(evaluation.type)} alt={evaluation.type} width={20} height={20} className="opacity-70" /></div>
                  </div>
                </GlassCard>
              )) : (
                <div className="text-center py-8"><p className="text-text-tertiary">No evaluations found for this resident.</p></div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}