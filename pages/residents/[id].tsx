// pages/residents/[id].tsx

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, PerformanceChart, StatCard } from '../../components/ui';

interface Resident {
  id: string;
  name: string;
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
  status: 'completed' | 'in-progress' | 'failed';
}

export default function ResidentProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [resident, setResident] = useState<Resident | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvaluations: 0,
    avgScore: 0,
    completedEvaluations: 0,
    improvement: 0
  });

  useEffect(() => {
    if (!id) return;

    const fetchResidentData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/residents/${id}`);
            if (!res.ok) {
                throw new Error('Failed to fetch resident data');
            }
            const residentData = await res.json();
            setResident(residentData);

            // Mock evaluations for now, can be replaced with API call later
            const mockEvaluations: Evaluation[] = [
              { id: '1', surgery: 'Laparoscopic Cholecystectomy', date: '2024-01-15', score: 4.5, type: 'video', status: 'completed' },
              { id: '2', surgery: 'Inguinal Hernia Repair', date: '2024-01-10', score: 4.2, type: 'audio', status: 'completed' },
              { id: '3', surgery: 'Appendectomy', date: '2024-01-05', score: 4.8, type: 'video', status: 'completed' },
              { id: '4', surgery: 'Ventral Hernia Repair', date: '2024-01-20', type: 'video', status: 'in-progress' }
            ];
            setEvaluations(mockEvaluations);

            const completed = mockEvaluations.filter(e => e.status === 'completed');
            const avgScore = completed.length > 0 ? completed.reduce((acc, e) => acc + (e.score || 0), 0) / completed.length : 0;
            
            setStats({
              totalEvaluations: mockEvaluations.length,
              avgScore: avgScore,
              completedEvaluations: completed.length,
              improvement: 12 // Mock improvement percentage
            });

        } catch (error) {
            console.error(error);
            setResident(null);
        } finally {
            setLoading(false);
        }
    };

    fetchResidentData();
  }, [id]);

  const getSurgeryIcon = (surgery: string) => {
    if (surgery.toLowerCase().includes('cholecyst')) return '/images/galbladderArt.svg';
    if (surgery.toLowerCase().includes('appendic')) return '/images/appendectomyArt.svg';
    if (surgery.toLowerCase().includes('inguinal')) return '/images/inguinalHerniaArt.svg';
    if (surgery.toLowerCase().includes('ventral')) return '/images/ventralHerniaArt.svg';
    return '/images/default-avatar.svg';
  };

  const getTypeIcon = (type: string) => {
    return type === 'video' ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'status-success';
      case 'in-progress': return 'status-warning';
      case 'failed': return 'status-error';
      default: return 'status-info';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-tertiary">Loading resident profile...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <h2 className="heading-md text-red-400">Error</h2>
                <p className="text-text-tertiary">Could not load resident profile.</p>
                <GlassButton variant="secondary" onClick={() => router.push('/residents')} className="mt-4">
                    Back to Residents
                </GlassButton>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <GlassButton variant="ghost" onClick={() => router.back()}>
          ← Back
        </GlassButton>
      </div>

      <GlassCard variant="strong" className="p-8">
        <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="glassmorphism-subtle p-4 rounded-3xl">
            <Image
              src={resident.photoUrl || '/images/default-avatar.svg'}
              alt={resident.name}
              width={120}
              height={120}
              className="rounded-3xl object-cover"
              onError={(e) => { e.currentTarget.src = '/images/default-avatar.svg'; }}
            />
          </div>
          <div className="flex-1">
            <h1 className="heading-xl text-gradient mb-2">{resident.name}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text-secondary">
              <div>
                <p className="text-sm text-text-quaternary mb-1">Institution</p>
                <p className="font-medium">{resident.company || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-text-quaternary mb-1">Training Year</p>
                <p className="font-medium">{resident.year || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-text-quaternary mb-1">Medical School</p>
                <p className="font-medium">{resident.medicalSchool || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-text-quaternary mb-1">Start Date</p>
                <p className="font-medium">{new Date(resident.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Evaluations" value={stats.totalEvaluations} icon="/images/eval-count-icon.svg" />
        <StatCard title="Average Score" value={`${stats.avgScore.toFixed(1)}/5.0`} icon="/images/avg-score-icon.svg" />
        <StatCard title="Completed" value={stats.completedEvaluations} icon="/images/ready-icon.svg" />
        <StatCard title="Improvement" value={`+${stats.improvement}%`} icon="/images/improve-icon.svg" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <GlassCard variant="strong" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md">Performance Over Time</h3>
              <div className="flex space-x-2">
                <GlassButton variant="ghost" size="sm">3M</GlassButton>
                <GlassButton variant="secondary" size="sm">6M</GlassButton>
                <GlassButton variant="ghost" size="sm">1Y</GlassButton>
              </div>
            </div>
            <div className="h-64">
              <PerformanceChart residentName={resident.name} height={240} />
            </div>
          </GlassCard>
        </div>

        <div className="xl:col-span-1">
          <GlassCard variant="strong" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="heading-md">Recent Evaluations</h3>
              <GlassButton variant="primary" size="sm" onClick={() => router.push('/')}>
                New Evaluation
              </GlassButton>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-glass">
              {evaluations.map((evaluation) => (
                <GlassCard key={evaluation.id} variant="subtle" hover onClick={() => router.push(`/results/${evaluation.id}`)} className="p-4 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Image src={getSurgeryIcon(evaluation.surgery)} alt={evaluation.surgery} width={32} height={32} className="opacity-80" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-primary truncate">{evaluation.surgery}</h4>
                      <div className="flex items-center space-x-2 text-xs text-text-tertiary">
                        <span>{evaluation.date}</span>
                        <span className={`${getStatusBadge(evaluation.status)}`}>{evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1)}</span>
                      </div>
                      {evaluation.score && (
                        <div className="flex items-center space-x-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.floor(evaluation.score!) ? 'bg-brand-secondary' : 'bg-glass-300'}`} />
                          ))}
                          <span className="text-xs text-text-quaternary ml-1">{evaluation.score}/5</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Image src={getTypeIcon(evaluation.type)} alt={evaluation.type} width={20} height={20} className="opacity-70" />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
