// pages/evaluations.tsx
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '../components/ui';
import ResidentSelector from '../components/ResidentSelector';
import { useApi } from '../lib/useApi';

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
  photoUrl?: string | null;
  year?: string;
}

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<Evaluation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const router = useRouter();
  const { status: statusFromQuery } = router.query;
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluations, setSelectedEvaluations] = useState<string[]>([]);
  const { apiFetch } = useApi();

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const [evalsData, residentsData] = await Promise.all([
        apiFetch('/api/evaluations'),
        apiFetch('/api/residents'),
      ]);

      const filteredData = evalsData.filter((e: { id: string; }) => !['cmcv3j0zk0001onk7im7zzcvf', 'cmcv3b0x70003on8x81k8nbr4', 'cmculodur0001on12vsinf5gu'].includes(e.id));
      setEvaluations(filteredData);
      setFilteredEvaluations(filteredData);
      setResidents(residentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setEvaluations([]);
      setFilteredEvaluations([]);
      setResidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (statusFromQuery) {
      setFilterStatus(statusFromQuery as string);
    }
  }, [statusFromQuery]);

  useEffect(() => {
    fetchEvaluations();
  }, [apiFetch]);

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = filteredEvaluations.map(ev => ev.id);
      setSelectedEvaluations(allIds);
    } else {
      setSelectedEvaluations([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedEvaluations(prev =>
      prev.includes(id) ? prev.filter(prevId => prevId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedEvaluations.length === 0 || !window.confirm(`Are you sure you want to delete ${selectedEvaluations.length} evaluation(s)?`)) {
      return;
    }
    
    try {
      console.log('[Delete] Starting deletion process for IDs:', selectedEvaluations);
      
      await apiFetch('/api/evaluations/delete-many', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedEvaluations }),
      });
      
      console.log('[Delete] API call successful, updating frontend state');
      
      // Update the local state to remove deleted evaluations
      setEvaluations(prev => prev.filter(ev => !selectedEvaluations.includes(ev.id)));
      setSelectedEvaluations([]);
      
      console.log('[Delete] Frontend state updated successfully');
      alert(`Successfully deleted ${selectedEvaluations.length} evaluation(s).`);
      
    } catch (error) {
      console.error('[Delete] Error during deletion process:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete selected evaluations: ${errorMessage}`);
    }
  };

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
          <div className="relative z-40">
            <ResidentSelector residents={residents} selected={selectedResident} setSelected={setSelectedResident} />
          </div>
          <div className="relative z-30">
            <label className="block mb-2 text-sm font-medium text-text-secondary">Filter by Type</label>
            <GlassSelect value={filterType} onChange={(e) => setFilterType(e.target.value)} options={[{ value: 'all', label: 'All Types' }, { value: 'video', label: 'Video Analysis' }, { value: 'audio', label: 'Audio Analysis' }]} />
          </div>
          <div className="relative z-20">
            <label className="block mb-2 text-sm font-medium text-text-secondary">Filter by Status</label>
            <GlassSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} options={[{ value: 'all', label: 'All Statuses' }, { value: 'finalized', label: 'Finalized' }, { value: 'draft', label: 'Draft' }, { value: 'in-progress', label: 'In Progress' }, { value: 'failed', label: 'Failed' }]} />
          </div>
        </div>
      </GlassCard>

      <GlassCard variant="strong" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              onChange={handleSelectAll}
              checked={selectedEvaluations.length === filteredEvaluations.length && filteredEvaluations.length > 0}
            />
            <h3 className="heading-md">Evaluations ({filteredEvaluations.length})</h3>
          </div>
          <div className="flex items-center gap-4">
            {selectedEvaluations.length > 0 && (
              <GlassButton variant="ghost" onClick={handleDeleteSelected} className="!text-red-400 hover:!bg-red-500/20">
                Delete Selected ({selectedEvaluations.length})
              </GlassButton>
            )}
            <GlassButton variant="ghost" onClick={fetchEvaluations} disabled={loading}>
              Refresh
            </GlassButton>
            <GlassButton variant="primary" onClick={() => router.push('/')}>New Evaluation</GlassButton>
          </div>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16"><div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : filteredEvaluations.length > 0 ? (
            filteredEvaluations.map((evaluation) => {
              const resident = residents.find(r => r.id === evaluation.residentId);
              return (
                <GlassCard key={evaluation.id} variant="subtle" hover className="p-6">
                  <div className="flex items-center justify-between space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedEvaluations.includes(evaluation.id)}
                      onChange={() => handleSelectOne(evaluation.id)}
                      className="mr-4"
                    />
                    {/* Left Part */}
                    <div onClick={() => router.push(`/results/${evaluation.id}`)} className="flex items-center space-x-4 flex-1 min-w-0 cursor-pointer">
                      <Image
                        src={resident?.photoUrl || '/images/default-avatar.svg'}
                        alt={evaluation.residentName || 'Resident'}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-text-primary mb-1 text-lg truncate">{evaluation.surgery}</h4>
                        <div className="flex items-center space-x-2 text-sm text-text-tertiary truncate">
                          <span>{evaluation.residentName || 'N/A'}</span>
                          <span className="text-text-quaternary"> • </span>
                          <span>{evaluation.date}</span>
                        </div>
                        {evaluation.score && (
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="flex items-center space-x-1">{[...Array(5)].map((_, i) => (<div key={i} className={`w-2.5 h-2.5 rounded-full ${i < Math.floor(evaluation.score!) ? 'bg-brand-secondary' : 'bg-glass-300'}`} />))}</div>
                            <span className="text-sm text-text-quaternary font-medium">{evaluation.score.toFixed(1)}/5.0</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Center Part */}
                    <div className="flex-shrink-0">
                      <Image src={getTypeIcon(!!evaluation.videoAnalysis)} alt={evaluation.videoAnalysis ? 'Visual Analysis' : 'Audio Analysis'} width={160} height={160} />
                    </div>

                    {/* Right Part */}
                    <div className="flex items-center space-x-4 flex-shrink-0">
                      <span className={`${getStatusBadge(evaluation)} text-xs`}>{getStatusText(evaluation)}</span>
                      <div className="glassmorphism-subtle p-3 rounded-2xl"><Image src="/images/arrow-right-icon.svg" alt="View" width={16} height={16} /></div>
                    </div>
                  </div>
                </GlassCard>
              )
            })
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