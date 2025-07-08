import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '../components/ui';

interface Evaluation {
  id: string;
  surgery: string;
  date: string;
  residentName?: string;
  score?: number;
  type: 'video' | 'audio';
  status: 'completed' | 'in-progress' | 'failed';
}

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<Evaluation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    // Mock data for demonstration
    const mockEvaluations: Evaluation[] = [
      { 
        id: '1', 
        surgery: 'Laparoscopic Cholecystectomy', 
        date: '2024-01-15', 
        residentName: 'Dr. Sarah Johnson', 
        score: 4.5, 
        type: 'video',
        status: 'completed'
      },
      { 
        id: '2', 
        surgery: 'Robotic Cholecystectomy', 
        date: '2024-01-14', 
        residentName: 'Dr. Michael Chen', 
        score: 4.2, 
        type: 'audio',
        status: 'completed'
      },
      { 
        id: '3', 
        surgery: 'Laparoscopic Appendicectomy', 
        date: '2024-01-13', 
        residentName: 'Dr. Emily Rodriguez', 
        score: 4.8, 
        type: 'video',
        status: 'completed'
      },
      { 
        id: '4', 
        surgery: 'Inguinal Hernia Repair', 
        date: '2024-01-12', 
        residentName: 'Dr. James Wilson', 
        score: 3.9, 
        type: 'audio',
        status: 'completed'
      },
      { 
        id: '5', 
        surgery: 'Ventral Hernia Repair', 
        date: '2024-01-11', 
        residentName: 'Dr. Lisa Brown', 
        type: 'video',
        status: 'in-progress'
      }
    ];

    setEvaluations(mockEvaluations);
    setFilteredEvaluations(mockEvaluations);
  }, []);

  useEffect(() => {
    let filtered = evaluations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(eval => 
        eval.surgery.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eval.residentName && eval.residentName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(eval => eval.type === filterType);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(eval => eval.status === filterStatus);
    }

    setFilteredEvaluations(filtered);
  }, [evaluations, searchTerm, filterType, filterStatus]);

  const getTypeIcon = (type: string) => {
    return type === 'video' ? '/images/visualAnalysis.svg' : '/images/audioAnalysis.svg';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-success';
      case 'in-progress':
        return 'status-warning';
      case 'failed':
        return 'status-error';
      default:
        return 'status-info';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center lg:text-left">
        <h1 className="heading-xl text-gradient mb-2">All Evaluations</h1>
        <p className="text-text-tertiary text-lg">
          Comprehensive view of all surgical assessments and their progress
        </p>
      </div>

      {/* Filters Section */}
      <GlassCard variant="strong" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-text-secondary">
              Search Evaluations
            </label>
            <GlassInput
              type="text"
              placeholder="Search by surgery or resident..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-text-secondary">
              Filter by Type
            </label>
            <GlassSelect
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'video', label: 'Video Analysis' },
                { value: 'audio', label: 'Audio Analysis' }
              ]}
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-text-secondary">
              Filter by Status
            </label>
            <GlassSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'failed', label: 'Failed' }
              ]}
            />
          </div>
        </div>
      </GlassCard>

      {/* Evaluations List */}
      <GlassCard variant="strong" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="heading-md">
            Evaluations ({filteredEvaluations.length})
          </h3>
          <GlassButton
            variant="primary"
            onClick={() => router.push('/')}
          >
            New Evaluation
          </GlassButton>
        </div>

        <div className="space-y-4">
          {filteredEvaluations.map((evaluation) => (
            <GlassCard
              key={evaluation.id}
              variant="subtle"
              hover
              onClick={() => router.push(`/results/${evaluation.id}`)}
              className="p-6 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Type Icon */}
                  <div className="glassmorphism-subtle p-3 rounded-2xl">
                    <Image 
                      src={getTypeIcon(evaluation.type)} 
                      alt={evaluation.type} 
                      width={24} 
                      height={24}
                      className="opacity-80"
                    />
                  </div>
                  
                  {/* Evaluation Details */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-text-primary mb-1 text-lg">
                      {evaluation.surgery}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-text-tertiary">
                      <span>{evaluation.residentName || 'N/A'}</span>
                      <span>•</span>
                      <span>{evaluation.date}</span>
                      <span>•</span>
                      <span className={`${getStatusBadge(evaluation.status)} text-xs`}>
                        {evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1).replace('-', ' ')}
                      </span>
                    </div>
                    
                    {/* Score Display */}
                    {evaluation.score && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2.5 h-2.5 rounded-full ${
                                i < Math.floor(evaluation.score!) ? 'bg-brand-secondary' : 'bg-glass-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-text-quaternary font-medium">
                          {evaluation.score}/5.0
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Arrow Icon */}
                <div className="glassmorphism-subtle p-3 rounded-2xl">
                  <Image src="/images/arrow-right-icon.svg" alt="View" width={16} height={16} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        
        {filteredEvaluations.length === 0 && (
          <div className="text-center py-16">
            <div className="glassmorphism-subtle p-8 rounded-3xl w-fit mx-auto mb-6">
              <Image 
                src="/images/dashboard-icon.svg" 
                alt="No evaluations" 
                width={48} 
                height={48} 
                className="opacity-50" 
              />
            </div>
            <h3 className="heading-sm mb-2">No evaluations found</h3>
            <p className="text-text-tertiary mb-6">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? 'Try adjusting your filters to see more results'
                : 'Start your first evaluation to see results here'
              }
            </p>
            <GlassButton
              variant="primary"
              onClick={() => router.push('/')}
            >
              Create New Evaluation
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}