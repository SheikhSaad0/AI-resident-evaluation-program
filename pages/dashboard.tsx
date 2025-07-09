import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, StatCard } from '../components/ui';

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
  result?: any;
}

interface ProcedurePerformance {
  name: string;
  score: number;
}

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const getSurgeryIcon = (s: string) => {
    if (!s) return '/images/dashboard-icon.svg';
    if (s.toLowerCase().includes('cholecyst')) return '/images/galbladderArt.png';
    if (s.toLowerCase().includes('appendic')) return '/images/appendectomyArt.png';
    if (s.toLowerCase().includes('inguinal')) return '/images/herniaArt.png';
    if (s.toLowerCase().includes('ventral')) return '/images/herniaArt.png';
    return '/images/dashboard-icon.svg';
};


export default function Dashboard() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [lowestProcedure, setLowestProcedure] = useState<ProcedurePerformance | null>(null);
  const [avgCaseDifficulty, setAvgCaseDifficulty] = useState(0);
  const [stats, setStats] = useState({
    totalEvals: 0,
    drafts: 0,
    avgScore: 0,
    practiceReady: 0,
    needsImprovement: 0,
    totalEvalsTrend: 0,
    avgScoreTrend: 0,
    practiceReadyTrend: 0,
    needsImprovementTrend: 0,
    avgCaseDifficultyTrend: 0,
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
          const evalsData: Evaluation[] = await evalsResponse.json();
          setEvaluations(evalsData);

          const finalizedEvals = evalsData.filter((e) => e.isFinalized && e.score !== undefined && e.score !== null);
          
          if (finalizedEvals.length > 0) {
            const procedureScores: { [key: string]: { scores: number[], count: number } } = {};
            finalizedEvals.forEach(e => {
              if (!procedureScores[e.surgery]) {
                procedureScores[e.surgery] = { scores: [], count: 0 };
              }
              procedureScores[e.surgery].scores.push(e.score!);
              procedureScores[e.surgery].count++;
            });

            const procedureAverages = Object.entries(procedureScores).map(([name, data]) => ({
              name,
              score: data.scores.reduce((a, b) => a + b, 0) / data.count,
            }));
            
            if(procedureAverages.length > 0) {
              setLowestProcedure(procedureAverages.sort((a, b) => a.score - b.score)[0]);
            }
          }

          const totalEvals = evalsData.length;
          const draftsCount = evalsData.filter((e) => !e.isFinalized).length;

          const calculateMetrics = (evals: Evaluation[]) => {
            if (evals.length === 0) return { avgScore: 0, practiceReady: 0, needsImprovement: 0, avgDifficulty: 0 };
            const avgScore = evals.reduce((acc: number, e: Evaluation) => acc + (e.score || 0), 0) / evals.length;
            const practiceReadyCount = evals.filter((e: Evaluation) => e.score && e.score >= 4).length;
            const needsImprovementCount = evals.filter((e: Evaluation) => e.score && e.score < 3).length;
            const difficulties = evals.map(e => e.result?.attendingCaseDifficulty || e.result?.caseDifficulty).filter(d => typeof d === 'number');
            const avgDifficulty = difficulties.length > 0 ? difficulties.reduce((a,b) => a+b, 0) / difficulties.length : 0;
            const practiceReady = (practiceReadyCount / evals.length) * 100;
            const needsImprovement = (needsImprovementCount / evals.length) * 100;
            return { avgScore, practiceReady, needsImprovement, avgDifficulty };
          };
          
          const currentMonthEvals = finalizedEvals.filter((e) => new Date(e.date) >= new Date(new Date().setMonth(new Date().getMonth() - 1)));
          const previousMonthEvals = finalizedEvals.filter((e) => new Date(e.date) < new Date(new Date().setMonth(new Date().getMonth() - 1)));
          
          const currentMetrics = calculateMetrics(currentMonthEvals);
          const previousMetrics = calculateMetrics(previousMonthEvals);
          const allTimeMetrics = calculateMetrics(finalizedEvals);

          setAvgCaseDifficulty(allTimeMetrics.avgDifficulty);
          setStats({
            totalEvals,
            drafts: draftsCount,
            avgScore: allTimeMetrics.avgScore,
            practiceReady: allTimeMetrics.practiceReady,
            needsImprovement: allTimeMetrics.needsImprovement,
            totalEvalsTrend: calculateTrend(currentMonthEvals.length, previousMonthEvals.length),
            avgScoreTrend: calculateTrend(currentMetrics.avgScore, previousMetrics.avgScore),
            practiceReadyTrend: calculateTrend(currentMetrics.practiceReady, previousMetrics.practiceReady),
            needsImprovementTrend: calculateTrend(currentMetrics.needsImprovement, previousMetrics.needsImprovement),
            avgCaseDifficultyTrend: calculateTrend(currentMetrics.avgDifficulty, previousMetrics.avgDifficulty)
          });
        }
      } catch (error: any) {
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
      
      {/* --- Stat Cards Rows --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Evaluations" value={stats.totalEvals} icon="/images/eval-count-icon.svg" trend={{ value: stats.totalEvalsTrend, isPositive: stats.totalEvalsTrend >= 0 }} onClick={() => router.push('/evaluations')} />
          <StatCard title="Drafts" value={stats.drafts} icon="/images/draft-icon.svg" subtitle="In Progress" />
          <StatCard title="Average Score" value={`${stats.avgScore.toFixed(1)}/5.0`} icon="/images/avg-score-icon.svg" trend={{ value: stats.avgScoreTrend, isPositive: stats.avgScoreTrend >= 0 }} subtitle="Finalized Evals" />
          <StatCard title="Practice Ready" value={`${stats.practiceReady.toFixed(0)}%`} icon="/images/ready-icon.svg" trend={{ value: stats.practiceReadyTrend, isPositive: stats.practiceReadyTrend >= 0 }} subtitle="Residents qualified" />
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Needs Improvement" value={`${stats.needsImprovement.toFixed(0)}%`} icon="/images/improve-icon.svg" trend={{ value: stats.needsImprovementTrend, isPositive: stats.needsImprovementTrend <= 0 }} subtitle="Requires attention" />
          <StatCard title="Avg. Case Difficulty" value={avgCaseDifficulty > 0 ? avgCaseDifficulty.toFixed(1) : 'N/A'} icon="/images/difficulty-icon.svg" trend={{ value: stats.avgCaseDifficultyTrend, isPositive: stats.avgCaseDifficultyTrend <= 0 }} subtitle="From 1 to 3" />
          
          {/* Custom Wide Stat Card - UPDATED */}
          <div className="lg:col-span-2">
            <GlassCard variant='default' className="h-full">
                <div className="flex items-center justify-between p-6 h-full">
                    <div className="flex-1">
                        <p className="text-text-tertiary text-sm font-medium mb-1">Lowest Scored Proc.</p>
                        <p className="heading-md truncate">{lowestProcedure ? lowestProcedure.name : 'N/A'}</p>
                        <p className="text-text-quaternary text-xs mt-1">{lowestProcedure ? `${lowestProcedure.score.toFixed(1)}/5.0` : 'No finalized evals'}</p>
                    </div>
                    {lowestProcedure && (
                        <Image src={getSurgeryIcon(lowestProcedure.name)} alt={lowestProcedure.name} width={80} height={80} className="opacity-80 ml-4" />
                    )}
                </div>
            </GlassCard>
          </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <RecentEvaluationsWidget evaluations={evaluations} />
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
                  <p className="text-sm text-text-tertiary mb-2">{evaluation.residentName || 'N/A'} • {new Date(evaluation.date).toLocaleString()} • <span className={`${status.badge} text-xs`}>{status.text}</span> • <span className="text-xs">{analysisTypeText}</span></p>
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

const ResidentsWidget = ({ residents }: { residents: Resident[] }) => {
  const router = useRouter();
  return (
    <GlassCard variant="strong" className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-md">Residents</h3>
        <GlassButton variant="primary" size="sm" onClick={() => router.push('/residents')}>Manage Residents</GlassButton>
      </div>
      <div>
        <h4 className="text-sm font-medium text-text-tertiary mb-3">Current Residents ({residents.length})</h4>
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-glass">
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