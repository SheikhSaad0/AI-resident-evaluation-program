import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, StatCard, PerformanceChart } from '../components/ui';

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
  type?: 'video' | 'audio'; // Add type for analysis method
}

// Main Dashboard Component
export default function Dashboard() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [stats, setStats] = useState({ totalEvals: 0, avgScore: 0 });
  const router = useRouter();

  useEffect(() => {
    // Mock data for demonstration
    const mockResidents = [
      { id: '1', name: 'Dr. Sarah Johnson', photoUrl: null },
      { id: '2', name: 'Dr. Michael Chen', photoUrl: null },
      { id: '3', name: 'Dr. Emily Rodriguez', photoUrl: null }
    ];

    const mockEvaluations = [
      { id: '1', surgery: 'Laparoscopic Cholecystectomy', date: '2024-01-15', residentName: 'Dr. Sarah Johnson', score: 4.5, type: 'video' as const },
      { id: '2', surgery: 'Robotic Cholecystectomy', date: '2024-01-14', residentName: 'Dr. Michael Chen', score: 4.2, type: 'audio' as const },
      { id: '3', surgery: 'Laparoscopic Appendicectomy', date: '2024-01-13', residentName: 'Dr. Emily Rodriguez', score: 4.8, type: 'video' as const }
    ];

    setResidents(mockResidents);
    setEvaluations(mockEvaluations);
    setStats({ 
      totalEvals: mockEvaluations.length, 
      avgScore: mockEvaluations.reduce((acc, evaluation) => acc + (evaluation.score || 0), 0) / mockEvaluations.length 
    });
  }, []);

  const handleResidentAdded = (newResident: Resident) => {
    setResidents(prev => [newResident, ...prev]);
  };
  
  const handleResidentDeleted = (deletedResidentId: string) => {
    setResidents(prev => prev.filter(r => r.id !== deletedResidentId));
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center lg:text-left">
        <h1 className="heading-xl text-gradient mb-2">Dashboard</h1>
        <p className="text-text-tertiary text-lg">
          Comprehensive overview of surgical evaluation performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total Evaluations" 
          value={stats.totalEvals} 
          icon="/images/eval-count-icon.svg"
          trend={{ value: 12, isPositive: true }}
          onClick={() => console.log('View all evaluations')}
        />
        <StatCard 
          title="Average Score" 
          value={`${stats.avgScore.toFixed(1)}/5.0`} 
          icon="/images/avg-score-icon.svg"
          trend={{ value: 8, isPositive: true }}
          subtitle="Performance Rating"
        />
        <StatCard 
          title="Practice Ready" 
          value="85%" 
          icon="/images/ready-icon.svg"
          trend={{ value: 5, isPositive: true }}
          subtitle="Residents qualified"
        />
        <StatCard 
          title="Needs Improvement" 
          value="15%" 
          icon="/images/improve-icon.svg"
          trend={{ value: 3, isPositive: false }}
          subtitle="Requires attention"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Recent Evaluations & Chart */}
        <div className="xl:col-span-2 space-y-8">
          <RecentEvaluationsWidget evaluations={evaluations} />
          <ChartWidget />
        </div>
        
        {/* Right Column - Residents Management */}
        <div className="xl:col-span-1">
          <ResidentsWidget 
            residents={residents} 
            onResidentAdded={handleResidentAdded} 
            onResidentDeleted={handleResidentDeleted}
          />
        </div>
      </div>
    </div>
  );
}

// Enhanced Recent Evaluations Widget
const RecentEvaluationsWidget = ({ evaluations }: { evaluations: Evaluation[] }) => {
  const router = useRouter();
  
  const getTypeIcon = (type?: string) => {
    return type === 'video' ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg';
  };
  
  return (
    <GlassCard variant="strong" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-md">Recent Evaluations</h3>
        <GlassButton 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/evaluations')}
        >
          View All
        </GlassButton>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-glass">
        {evaluations.map((evaluation) => (
          <GlassCard
            key={evaluation.id}
            variant="subtle"
            hover
            onClick={() => router.push(`/results/${evaluation.id}`)}
            className="p-4 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-text-primary mb-1">{evaluation.surgery}</h4>
                <p className="text-sm text-text-tertiary mb-2">
                  {evaluation.residentName || 'N/A'} • {evaluation.date}
                </p>
                {evaluation.score && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < Math.floor(evaluation.score!) ? 'bg-brand-secondary' : 'bg-glass-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-text-quaternary">{evaluation.score}/5.0</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Type Indicator */}
                <div className="glassmorphism-subtle p-2 rounded-2xl">
                  <Image 
                    src={getTypeIcon(evaluation.type)} 
                    alt={evaluation.type || 'analysis'} 
                    width={20} 
                    height={20}
                    className="opacity-70"
                  />
                </div>
                
                <div className="glassmorphism-subtle p-2 rounded-2xl">
                  <Image src="/images/arrow-right-icon.svg" alt="View" width={16} height={16} />
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      
      {evaluations.length === 0 && (
        <div className="text-center py-12">
          <div className="glassmorphism-subtle p-6 rounded-3xl w-fit mx-auto mb-4">
            <Image src="/images/eval-count-icon.svg" alt="No evaluations" width={32} height={32} className="opacity-50" />
          </div>
          <p className="text-text-tertiary">No evaluations yet</p>
          <p className="text-text-quaternary text-sm">Start your first evaluation to see results here</p>
        </div>
      )}
    </GlassCard>
  );
};

// Enhanced Chart Widget
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
    
    <div className="h-64">
      <PerformanceChart height={240} />
    </div>
  </GlassCard>
);

// Enhanced Residents Widget
const ResidentsWidget = ({ 
  residents, 
  onResidentAdded, 
  onResidentDeleted 
}: { 
  residents: Resident[], 
  onResidentAdded: (resident: Resident) => void, 
  onResidentDeleted: (id: string) => void 
}) => {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    
    // Simulate API call
    setTimeout(() => {
      const newResident: Resident = {
        id: Date.now().toString(),
        name: name.trim(),
        photoUrl: photo.trim() || null
      };
      
      onResidentAdded(newResident);
      setName('');
      setPhoto('');
      setIsAdding(false);
    }, 500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this resident? This action cannot be undone.')) return;
    onResidentDeleted(id);
  };

  return (
    <GlassCard variant="strong" className="p-6">
      <h3 className="heading-md mb-6">Manage Residents</h3>
      
      {/* Add Resident Form */}
      <form onSubmit={handleAddResident} className="space-y-4 mb-6">
        <GlassInput
          type="text"
          placeholder="Resident Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <GlassInput
          type="url"
          placeholder="Photo URL (optional)"
          value={photo}
          onChange={(e) => setPhoto(e.target.value)}
        />
        <GlassButton
          type="submit"
          variant="primary"
          disabled={!name.trim()}
          loading={isAdding}
          className="w-full"
        >
          Add Resident
        </GlassButton>
      </form>

      {/* Residents List */}
      <div>
        <h4 className="text-sm font-medium text-text-tertiary mb-3">Current Residents ({residents.length})</h4>
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-glass">
          {residents.map((resident) => (
            <GlassCard key={resident.id} variant="subtle" className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="glassmorphism-subtle p-2 rounded-2xl">
                    <Image 
                      src={resident.photoUrl || '/images/default-avatar.svg'} 
                      alt={resident.name} 
                      width={32} 
                      height={32} 
                      className="rounded-2xl object-cover opacity-80"
                    />
                  </div>
                  <span className="font-medium text-text-primary">{resident.name}</span>
                </div>
                
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(resident.id)}
                  className="p-2 hover:bg-red-500/20 text-red-400"
                >
                  <Image src="/images/trashcanIcon.svg" alt="Delete" width={16} height={16} />
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
        
        {residents.length === 0 && (
          <div className="text-center py-8">
            <div className="glassmorphism-subtle p-4 rounded-3xl w-fit mx-auto mb-3">
              <Image src="/images/default-avatar.svg" alt="No residents" width={24} height={24} className="opacity-50" />
            </div>
            <p className="text-text-tertiary text-sm">No residents added yet</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
};