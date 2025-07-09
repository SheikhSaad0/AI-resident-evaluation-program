// pages/evaluations.tsx
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '../components/ui';
import ResidentSelector from '../components/ResidentSelector';

interface Evaluation {
  id: string;
  surgery: string;
  date: string;
  residentId?: string;
  residentName?: string;
  score?: number;
  type: 'video' | 'audio';
  status: string;
  isFinalized?: boolean;
  videoAnalysis?: boolean;
}

interface Resident {
  id: string;
  name: string;
  photoUrl?: string;
  year?: string;
}

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<Evaluation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchEvaluations = async () => {
      setLoading(true);
      try {
        const [evalsRes, residentsRes] = await Promise.all([
          fetch('/api/evaluations'),
          fetch('/api/residents'),
        ]);

        if (evalsRes.ok) {
          const data = await evalsRes.json();
          setEvaluations(data);
          setFilteredEvaluations(data);
        } else {
          console.error("Failed to fetch evaluations");
          setEvaluations([]);
          setFilteredEvaluations([]);
        }

        if (residentsRes.ok) {
          setResidents(await residentsRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvaluations();
  }, []);

  useEffect(() => {
    let filtered = evaluations;
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.surgery.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.residentName && e.residentName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (filterType !== 'all') {
      if (filterType === 'video') {
        filtered = filtered.filter(e => e.videoAnalysis);
      } else {
        filtered = filtered.filter(e => !e.videoAnalysis);
      }
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => {
        if (filterStatus === 'finalized') return e.isFinalized;
        if (filterStatus === 'draft') return (e.status === 'completed' || e.status === 'complete') && !e.isFinalized;
        if (filterStatus === 'in-progress') return e.status.startsWith('processing') || e.status === 'in-progress' || e.status === 'pending';
        return e.status === filterStatus;
      });
    }
    if (selectedResident) {
      filtered = filtered.filter(e => e.residentId === selectedResident.id);
    }
    setFilteredEvaluations(filtered);
  }, [evaluations, searchTerm, filterType, filterStatus, selectedResident]);

  const getTypeIcon = (videoAnalysis: boolean) => (videoAnalysis ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg');
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

  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="heading-xl text-gradient mb-2">All Evaluations</h1>
        <p className="text-text-tertiary text-lg">Comprehensive view of all surgical assessments and their progress</p>
      </div>
      <GlassCard variant="strong" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-secondary">Search Evaluations</label>
            <GlassInput type="text" placeholder="Search by surgery or resident..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="relative z-20">
            <ResidentSelector residents={residents} selected={selectedResident} setSelected={setSelectedResident} />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text-secondary">Filter by Type</label>
            <GlassSelect value={filterType} onChange={(e) => setFilterType(e.target.value)} options={[{ value: 'all', label: 'All Types' }, { value: 'video', label: 'Video Analysis' }, { value: 'audio', label: 'Audio Analysis' }]} />
          </div>
          <div>
          <label className="block mb-2 text-sm font-medium text-text-secondary">Filter by Status</label>
            <GlassSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} options={[{ value: 'all', label: 'All Statuses' }, { value: 'finalized', label: 'Finalized' }, { value: 'draft', label: 'Draft' }, { value: 'in-progress', label: 'In Progress' }, { value: 'failed', label: 'Failed' }]} />
          </div>
        </div>
      </GlassCard>
      <GlassCard variant="strong" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="heading-md">Evaluations ({filteredEvaluations.length})</h3>
          <GlassButton variant="primary" onClick={() => router.push('/')}>New Evaluation</GlassButton>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16"><div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : filteredEvaluations.length > 0 ? (
            filteredEvaluations.map((evaluation) => (
              <GlassCard key={evaluation.id} variant="subtle" hover onClick={() => router.push(`/results/${evaluation.id}`)} className="p-6 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Image src={getTypeIcon(!!evaluation.videoAnalysis)} alt={evaluation.videoAnalysis ? 'Visual Analysis' : 'Audio Analysis'} width={150} height={150} className="opacity-90" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary mb-1 text-lg">{evaluation.surgery} - <span className="text-brand-primary text-base font-medium">{evaluation.videoAnalysis ? 'Visual Analysis' : 'Audio Analysis'}</span></h4>
                      <div className="flex items-center space-x-4 text-sm text-text-tertiary">
                        <span>{evaluation.residentName || 'N/A'}</span><span>•</span><span>{evaluation.date}</span><span>•</span>
                        <span className={`${getStatusBadge(evaluation)} text-xs`}>{getStatusText(evaluation)}</span>
                      </div>
                      {evaluation.score && (
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="flex items-center space-x-1">{[...Array(5)].map((_, i) => (<div key={i} className={`w-2.5 h-2.5 rounded-full ${i < Math.floor(evaluation.score!) ? 'bg-brand-secondary' : 'bg-glass-300'}`} />))}</div>
                          <span className="text-sm text-text-quaternary font-medium">{evaluation.score.toFixed(1)}/5.0</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="glassmorphism-subtle p-3 rounded-2xl"><Image src="/images/arrow-right-icon.svg" alt="View" width={16} height={16} /></div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="glassmorphism-subtle p-8 rounded-3xl w-fit mx-auto mb-6"><Image src="/images/dashboard-icon.svg" alt="No evaluations" width={48} height={48} className="opacity-50" /></div>
              <h3 className="heading-sm mb-2">No evaluations found</h3>
              <p className="text-text-tertiary mb-6">{searchTerm || filterType !== 'all' || filterStatus !== 'all' ? 'Try adjusting your filters to see more results' : 'Start your first evaluation to see results here'}</p>
              <GlassButton variant="primary" onClick={() => router.push('/')}>Create New Evaluation</GlassButton>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}