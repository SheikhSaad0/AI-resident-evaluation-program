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
}

export default function Dashboard() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState({ totalEvals: 0, avgScore: 0 });
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
          const completedEvals = evalsData.filter((e: Evaluation) => e.score !== undefined);
          const avgScore = completedEvals.length > 0
            ? completedEvals.reduce((acc: number, e: Evaluation) => acc + (e.score || 0), 0) / completedEvals.length
            : 0;
          setStats({ totalEvals: evalsData.length, avgScore });
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
        <StatCard title="Total Evaluations" value={stats.totalEvals} icon="/images/eval-count-icon.svg" trend={{ value: 12, isPositive: true }} onClick={() => router.push('/evaluations')} />
        <StatCard title="Average Score" value={`${stats.avgScore.toFixed(1)}/5.0`} icon="/images/avg-score-icon.svg" trend={{ value: 8, isPositive: true }} subtitle="Performance Rating" />
        <StatCard title="Practice Ready" value="85%" icon="/images/ready-icon.svg" trend={{ value: 5, isPositive: true }} subtitle="Residents qualified" />
        <StatCard title="Needs Improvement" value="15%" icon="/images/improve-icon.svg" trend={{ value: 3, isPositive: false }} subtitle="Requires attention" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <RecentEvaluationsWidget evaluations={evaluations} />
          <ChartWidget />
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
  const getTypeIcon = (type: string) => (type === 'video' ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg');
  
  return (
    <GlassCard variant="strong" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-md">Recent Evaluations</h3>
        <GlassButton variant="ghost" size="sm" onClick={() => router.push('/evaluations')}>View All</GlassButton>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-glass">
        {evaluations.slice(0, 5).map((evaluation) => (
          <GlassCard key={evaluation.id} variant="subtle" hover onClick={() => router.push(`/results/${evaluation.id}`)} className="p-4 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-text-primary mb-1">{evaluation.surgery}</h4>
                <p className="text-sm text-text-tertiary mb-2">{evaluation.residentName || 'N/A'} • {evaluation.date}</p>
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
                <Image src={getTypeIcon(evaluation.type)} alt={evaluation.type} width={32} height={32} className="opacity-90" />
                <div className="glassmorphism-subtle p-2 rounded-2xl"><Image src="/images/arrow-right-icon.svg" alt="View" width={16} height={16} /></div>
              </div>
            </div>
          </GlassCard>
        ))}
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

const ChartWidget = () => (
  <GlassCard variant="strong" className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="heading-md">Performance Analytics</h3>
      <div className="flex space-x-2">
        <GlassButton variant="ghost" size="sm">Week</GlassButton>
        <GlassButton variant="secondary" size="sm">Month</GlassButton>
        <GlassButton variant="ghost" size="sm">Year</GlassButton>
      </div>
    </div>
    <div className="h-64"><PerformanceChart height={240} /></div>
  </GlassCard>
);

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
                  <Image src={resident.photoUrl || '/images/default-avatar.svg'} alt={resident.name} width={32} height={32} className="rounded-2xl object-cover opacity-80" />
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