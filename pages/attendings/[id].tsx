// pages/attendings/[id].tsx

import React, { useState, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, ImageUpload, PerformanceChart, StatCard, CaseDifficultyWidget, CaseTimeWidget } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import toast from 'react-hot-toast';
import { EVALUATION_CONFIGS } from '../../lib/evaluation-configs';

interface Attending {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  title: string | null;
  primaryInstitution: string | null;
  specialty: string | null;
  residency: string | null;
  medicalSchool: string | null;
  fellowship: string | null;
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
}

type TimeRange = 'all' | 'week' | 'month';

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

// Helper function to parse estimated time ranges like "5-10 min" into an average
const parseEstimatedTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.replace(/min/g, '').trim().split('-');
    if (parts.length === 2) {
        return (parseInt(parts[0], 10) + parseInt(parts[1], 10)) / 2;
    }
    return parseInt(parts[0], 10);
};


export default function AttendingProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { apiFetch } = useApi();

  // State
  const [attending, setAttending] = useState<Attending | null>(null);
  const [editedAttending, setEditedAttending] = useState<Attending | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  
  // State for calculated stats
  const [totalEvaluations, setTotalEvaluations] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [avgCaseDifficulty, setAvgCaseDifficulty] = useState(0);
  const [averageTimeDifference, setAverageTimeDifference] = useState(0);

  // Effect to fetch initial data
  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchAttendingData = async () => {
        setLoading(true);
        try {
            const attendingData = await apiFetch(`/api/attendings/${id}`);
            setAttending(attendingData);
            setEditedAttending(attendingData);

            const evalsData = await apiFetch(`/api/attendings/evaluations?id=${id}`);
            setEvaluations(evalsData);
        } catch (error) {
            console.error("Failed to fetch attending data:", error);
            toast.error("Could not load attending profile.");
            setAttending(null);
        } finally {
            setLoading(false);
        }
    };

    fetchAttendingData();
  }, [id, apiFetch]);

  // Effect to recalculate stats when evaluations or timeRange change
  useEffect(() => {
    if (evaluations.length === 0) return;

    const now = new Date();
    const filteredEvals = evaluations.filter(e => {
        if (timeRange === 'all') return true;
        const evalDate = new Date(e.date);
        if (timeRange === 'month') {
            return evalDate > new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        }
        if (timeRange === 'week') {
            return evalDate > new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        }
        return true;
    });

    const finalizedEvals = filteredEvals.filter(e => e.isFinalized && e.score !== undefined);

    // Calculate total evaluations and average score
    setTotalEvaluations(filteredEvals.length);
    const newAvgScore = finalizedEvals.length > 0 ? finalizedEvals.reduce((acc, e) => acc + (e.score || 0), 0) / finalizedEvals.length : 0;
    setAvgScore(newAvgScore);

    // Calculate average case difficulty
    const difficulties = finalizedEvals
        .map(e => e.result?.attendingCaseDifficulty || e.result?.caseDifficulty)
        .filter((d): d is number => typeof d === 'number');
    const newAvgDifficulty = difficulties.length > 0 ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length : 0;
    setAvgCaseDifficulty(newAvgDifficulty);
    
    // Calculate average case time difference
    let totalDifference = 0;
    let caseCount = 0;
    finalizedEvals.forEach(e => {
        const procedureId = Object.keys(EVALUATION_CONFIGS).find(key => EVALUATION_CONFIGS[key].name === e.surgery);
        if (procedureId && e.result) {
            const config = EVALUATION_CONFIGS[procedureId];
            let procedureTimeDiff = 0;
            let stepCount = 0;
            config.procedureSteps.forEach(step => {
                const stepData = e.result[step.key];
                if (stepData && stepData.time && step.time) {
                    const actualTime = parseTimeToMinutes(stepData.time);
                    const estimatedTime = parseEstimatedTime(step.time);
                    if (actualTime > 0 && estimatedTime > 0) {
                        procedureTimeDiff += actualTime - estimatedTime;
                        stepCount++;
                    }
                }
            });
            if (stepCount > 0) {
                totalDifference += procedureTimeDiff / stepCount; // Avg difference for the procedure
                caseCount++;
            }
        }
    });
    setAverageTimeDifference(caseCount > 0 ? totalDifference / caseCount : 0);

  }, [evaluations, timeRange]);

  const handleUpdate = async () => {
    if (!editedAttending) return;
    try {
        const updatedProfile = await apiFetch(`/api/attendings/${attending?.id}`, {
            method: 'PUT',
            body: editedAttending,
        });
        setAttending(updatedProfile);
        setEditedAttending(updatedProfile);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
    } catch (error) {
        console.error('Failed to update attending', error);
        toast.error('Failed to update profile.');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedAttending(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handlePhotoChange = (url: string) => {
    setEditedAttending(prev => prev ? { ...prev, photoUrl: url } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-tertiary">Loading Attending Profile...</p>
        </div>
      </div>
    );
  }

  if (!attending) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <h2 className="heading-lg text-red-400">Error</h2>
                <p className="text-text-tertiary">Could not load attending profile.</p>
                <GlassButton variant="secondary" onClick={() => router.push('/manage-profiles')} className="mt-6">
                    Back to Profiles
                </GlassButton>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <GlassButton variant="ghost" onClick={() => router.back()}>← Back</GlassButton>
        <GlassButton onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Cancel' : 'Edit'}</GlassButton>
      </div>
      <GlassCard variant="strong" className="p-8 relative">
        <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="glassmorphism-subtle p-2 rounded-full">
                <div className="w-[120px] h-[120px] rounded-full overflow-hidden">
                    <Image
                    src={attending.photoUrl || '/images/default-avatar.svg'}
                    alt={attending.name}
                    width={120}
                    height={120}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg'; }}
                    />
                </div>
            </div>

            <div className="flex-1">
                {isEditing && editedAttending ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="md:col-span-2">
                        <p className="text-sm text-text-quaternary mb-1">Profile Photo</p>
                        <ImageUpload value={editedAttending.photoUrl || undefined} onChange={handlePhotoChange}/>
                    </div>
                    {/* Input fields */}
                    <div><p className="text-sm text-text-quaternary mb-1">Name</p><GlassInput name="name" value={editedAttending.name} onChange={handleInputChange} /></div>
                    <div><p className="text-sm text-text-quaternary mb-1">Email</p><GlassInput name="email" value={editedAttending.email || ''} onChange={handleInputChange} /></div>
                    <div><p className="text-sm text-text-quaternary mb-1">Title</p><GlassInput name="title" value={editedAttending.title || ''} onChange={handleInputChange} /></div>
                    <div><p className="text-sm text-text-quaternary mb-1">Primary Institution</p><GlassInput name="primaryInstitution" value={editedAttending.primaryInstitution || ''} onChange={handleInputChange} /></div>
                    <div><p className="text-sm text-text-quaternary mb-1">Specialty</p><GlassInput name="specialty" value={editedAttending.specialty || ''} onChange={handleInputChange} /></div>
                    <div><p className="text-sm text-text-quaternary mb-1">Residency</p><GlassInput name="residency" value={editedAttending.residency || ''} onChange={handleInputChange} /></div>
                    <div><p className="text-sm text-text-quaternary mb-1">Medical School</p><GlassInput name="medicalSchool" value={editedAttending.medicalSchool || ''} onChange={handleInputChange} /></div>
                    <div><p className="text-sm text-text-quaternary mb-1">Fellowship</p><GlassInput name="fellowship" value={editedAttending.fellowship || ''} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2 flex justify-end space-x-4 mt-4">
                        <GlassButton variant="secondary" onClick={() => setIsEditing(false)}>Cancel</GlassButton>
                        <GlassButton onClick={handleUpdate}>Save Changes</GlassButton>
                    </div>
                </div>
                ) : (
                    <>
                        <h1 className="heading-xl text-gradient mb-2">{attending.name}</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text-secondary">
                        {/* Display fields */}
                        <div><p className="text-sm text-text-quaternary mb-1">Title</p><p className="font-medium">{attending.title || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Primary Institution</p><p className="font-medium">{attending.primaryInstitution || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Specialty</p><p className="font-medium">{attending.specialty || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Residency</p><p className="font-medium">{attending.residency || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Medical School</p><p className="font-medium">{attending.medicalSchool || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Fellowship</p><p className="font-medium">{attending.fellowship || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Email</p><p className="font-medium">{attending.email || 'N/A'}</p></div>
                        <div><p className="text-sm text-text-quaternary mb-1">Member Since</p><p className="font-medium">{new Date(attending.createdAt).toLocaleDateString()}</p></div>
                        </div>
                    </>
                )}
            </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="Total Evaluations" value={totalEvaluations} icon="/images/eval-count-icon.svg" />
          <StatCard title="Average Score" value={`${avgScore.toFixed(1)}/5.0`} icon="/images/avg-score-icon.svg" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="xl:col-span-2">
            <GlassCard variant="strong" className="p-6">
                <h3 className="heading-md mb-6">Performance Over Time</h3>
                <div className="h-64">
                    <PerformanceChart evaluations={evaluations} timeRange={timeRange} height={240} />
                </div>
            </GlassCard>
        </div>
        <div>
            <CaseDifficultyWidget averageDifficulty={avgCaseDifficulty} timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>
        <div>
            <CaseTimeWidget averageCaseTime={averageTimeDifference} timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>
      </div>
    </div>
  );
}