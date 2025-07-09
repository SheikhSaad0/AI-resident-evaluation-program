// pages/dashboard.tsx
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, StatCard, PerformanceChart } from '../components/ui';

interface Resident {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface Evaluation {
  id: string;
  surgery: string;
  date: string;
  residentName?: string;
  score?: number;
  type: 'video' | 'audio';
  isFinalized?: boolean;
  status: string;
  videoAnalysis?: boolean;
}

type TimeRange = 'week' | 'month' | '6M' | '1Y';

// --- NEW: Function to calculate trends ---
const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export default function Dashboard() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState({
    totalEvals: 0,
    avgScore: 0,
    practiceReady: 0,
    needsImprovement: 0,
    totalEvalsTrend: 0,
    avgScoreTrend: 0,
    practiceReadyTrend: 0,
    needsImprovementTrend: 0,
  });
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const residentsResponse = await fetch('/api/residents');
        if (residentsResponse.ok) {
          setResidents(await residentsResponse.json());
        }

        const evalsResponse = await fetch('/api/evaluations');
        if (evalsResponse.ok) {
          const evalsData = await evalsResponse.json();
          setEvaluations(evalsData);

          // --- REFINED: More robust data processing and trend calculation ---
          const now = new Date();
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

          const completedEvals = evalsData.filter((e: Evaluation) => e.score !== undefined && e.score !== null);
          const currentMonthEvals = completedEvals.filter((e: Evaluation) => new Date(e.date) >= oneMonthAgo);
          const previousMonthEvals = completedEvals.filter((e: Evaluation) => new Date(e.date) < oneMonthAgo);
          
          const totalEvals = evalsData.length;

          const calculateMetrics = (evals: Evaluation[]) => {
            if (evals.length === 0) return { avgScore: 0, practiceReady: 0, needsImprovement: 0 };
            const avgScore = evals.reduce((acc: number, e: Evaluation) => acc + (e.score || 0), 0) / evals.length;
            const practiceReadyCount = evals.filter((e: Evaluation) => e.score && e.score >= 4).length;
            const needsImprovementCount = evals.filter((e: Evaluation) => e.score && e.score < 3).length;
            const practiceReady = (practiceReadyCount / evals.length) * 100;
            const needsImprovement = (needsImprovementCount / evals.length) * 100;
            return { avgScore, practiceReady, needsImprovement };
          };

          const currentMetrics = calculateMetrics(currentMonthEvals);
          const previousMetrics = calculateMetrics(previousMonthEvals);

          setStats({
            totalEvals,
            avgScore: currentMetrics.avgScore,
            practiceReady: currentMetrics.practiceReady,
            needsImprovement: currentMetrics.needsImprovement,
            totalEvalsTrend: calculateTrend(currentMonthEvals.length, previousMonthEvals.length),
            avgScoreTrend: calculateTrend(currentMetrics.avgScore, previousMetrics.avgScore),
            practiceReadyTrend: calculateTrend(currentMetrics.practiceReady, previousMetrics.practiceReady),
            needsImprovementTrend: calculateTrend(currentMetrics.needsImprovement, previousMetrics.needsImprovement),
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="heading-xl text-gradient mb-2">Dashboard</h1>
        <p className="text-text-tertiary text-lg">Comprehensive overview of surgical evaluation performance</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* --- REFINED: StatCards now use the calculated trends --- */}
        <StatCard title="Total Evaluations" value={stats.totalEvals} icon="/images/eval-count-icon.svg" trend={{ value: stats.totalEvalsTrend, isPositive: stats.totalEvalsTrend >= 0 }} onClick={() => router.push('/evaluations')} />
        <StatCard title="Average Score" value={`${stats.avgScore.toFixed(1)}/5.0`} icon="/images/avg-score-icon.svg" trend={{ value: stats.avgScoreTrend, isPositive: stats.avgScoreTrend >= 0 }} subtitle="Performance Rating" />
        <StatCard title="Practice Ready" value={`${stats.practiceReady.toFixed(0)}%`} icon="/images/ready-icon.svg" trend={{ value: stats.practiceReadyTrend, isPositive: stats.practiceReadyTrend >= 0 }} subtitle="Residents qualified" />
        <StatCard title="Needs Improvement" value={`${stats.needsImprovement.toFixed(0)}%`} icon="/images/improve-icon.svg" trend={{ value: stats.needsImprovementTrend, isPositive: stats.needsImprovementTrend <= 0 }} subtitle="Requires attention" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <RecentEvaluationsWidget evaluations={evaluations} />
          <ChartWidget evaluations={evaluations} />
        </div>
        <div className="xl:col-span-1">
          <ResidentsWidget residents={residents} />
        </div>
      </div>
    </div>
  );
}

const RecentEvaluationsWidget = ({ evaluations }: { evaluations: Evaluation[] }) => {
  const router = useRouter();

  // --- REFINED: Simplified status logic ---
  const getStatusInfo = (evaluation: Evaluation) => {
    if (evaluation.isFinalized) return { text: 'Finalized', badge: 'status-success' };
    if (evaluation.status.startsWith('processing') || evaluation.status === 'in-progress' || evaluation.status === 'pending') return { text: 'In Progress', badge: 'status-warning' };
    if (evaluation.status === 'failed') return { text: 'Failed', badge: 'status-error' };
    if (evaluation.status === 'complete' || evaluation.status === 'completed') return { text: 'Draft', badge: 'status-info' };
    return { text: 'Unknown', badge: 'status-info' };
  };

  return (
    <GlassCard variant="strong" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-md">Recent Evaluations</h3>
        <GlassButton variant="ghost" size="sm" onClick={() => router.push('/evaluations')}>View All</GlassButton>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-glass">
        {evaluations.slice(0, 5).map((evaluation) => {
          const status = getStatusInfo(evaluation);
          const analysisTypeText = evaluation.videoAnalysis ? 'Visual Analysis' : 'Audio Analysis';
          return (
            <GlassCard key={evaluation.id} variant="subtle" hover onClick={() => router.push(`/results/${evaluation.id}`)} className="p-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-text-primary mb-1">{evaluation.surgery}</h4>
                  <p className="text-sm text-text-tertiary mb-2">{evaluation.residentName || 'N/A'} • {evaluation.date} • <span className={`${status.badge} text-xs`}>{status.text}</span> • <span className="text-xs">{analysisTypeText}</span></p>
                  {evaluation.score && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (<div key={i} className={`w-2 h-2 rounded-full ${i < Math.floor(evaluation.score!) ? 'bg-brand-secondary' : 'bg-glass-300'}`} />))}
                      </div>
                      <span className="text-xs text-text-quaternary">{evaluation.score.toFixed(1)}/5.0</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Image src={evaluation.videoAnalysis ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg'} alt={analysisTypeText} width={150} height={150} className="opacity-90" />
                  <div className="glassmorphism-subtle p-2 rounded-2xl"><Image src="/images/arrow-right-icon.svg" alt="View" width={16} height={16} /></div>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>
      {evaluations.length === 0 && (
        <div className="text-center py-12">
          <div className="glassmorphism-subtle p-6 rounded-3xl w-fit mx-auto mb-4"><Image src="/images/eval-count-icon.svg" alt="No evaluations" width={32} height={32} className="opacity-50" /></div>
          <p className="text-text-tertiary">No evaluations yet</p><p className="text-text-quaternary text-sm">Start your first evaluation to see results here</p>
        </div>
      )}
    </GlassCard>
  );
};

const ChartWidget = ({ evaluations }: { evaluations: Evaluation[] }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [procedureFilter, setProcedureFilter] = useState('all');

  return (
    <GlassCard variant="strong" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-md">Performance Analytics</h3>
        <div className="flex space-x-2">
          <GlassButton variant={timeRange === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('week')}>Week</GlassButton>
          <GlassButton variant={timeRange === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('month')}>Month</GlassButton>
          <GlassButton variant={timeRange === '6M' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('6M')}>6M</GlassButton>
          <GlassButton variant={timeRange === '1Y' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTimeRange('1Y')}>1Y</GlassButton>
        </div>
      </div>
      <div className="h-64">
        <PerformanceChart
          evaluations={evaluations}
          timeRange={timeRange}
          procedureFilter={procedureFilter}
          height={240}
        />
      </div>
    </GlassCard>
  );
};

const ResidentsWidget = ({ residents }: { residents: Resident[] }) => {
  const router = useRouter();
  return (
    <GlassCard variant="strong" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-md">Residents</h3>
        <GlassButton variant="primary" size="sm" onClick={() => router.push('/residents')}>Manage Residents</GlassButton>
      </div>
      <div>
        <h4 className="text-sm font-medium text-text-tertiary mb-3">Current Residents ({residents.length})</h4>
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-glass">
          {residents.map((resident) => (
            <GlassCard key={resident.id} variant="subtle" className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push(`/residents/${resident.id}`)}>
                  <Image src={resident.photoUrl || '/images/default-avatar.svg'} alt={resident.name} width={32} height={32} className="rounded-full object-cover w-8 h-8" />
                  <span className="font-medium text-text-primary">{resident.name}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        {residents.length === 0 && (
          <div className="text-center py-8">
            <div className="glassmorphism-subtle p-4 rounded-3xl w-fit mx-auto mb-3"><Image src="/images/default-avatar.svg" alt="No residents" width={24} height={24} className="opacity-50" /></div>
            <p className="text-text-tertiary text-sm">No residents added yet</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
};