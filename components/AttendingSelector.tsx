import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { GlassCard } from './ui';

// The component now uses the generic 'Supervisor' type
export interface Supervisor {
  id: string;
  name: string;
  photoUrl?: string | null;
  title?: string;
  type: 'Attending' | 'Program Director';
}

interface Props {
  // Props are renamed for clarity and use the correct type
  supervisors: Supervisor[];
  selectedSupervisor: Supervisor | null;
  setSelectedSupervisor: (supervisor: Supervisor | null) => void;
  disabled?: boolean;
}

const AttendingSelector: React.FC<Props> = ({ supervisors, selectedSupervisor, setSelectedSupervisor, disabled }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedSupervisors = [...supervisors].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative z-10">
      <label className="block mb-3 text-sm font-medium text-text-secondary">
        Supervisor
      </label>

      <div className="relative">
        <GlassCard
          variant="subtle"
          className={`p-4 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
          onClick={() => !disabled && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedSupervisor ? (
                <>
                  <Image
                    src={selectedSupervisor.photoUrl || '/images/default-avatar.svg'}
                    alt={selectedSupervisor.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover w-8 h-8"
                  />
                  <div>
                    <p className="font-medium text-text-primary">{selectedSupervisor.name}</p>
                    <p className="text-xs text-text-quaternary">{selectedSupervisor.type}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="glassmorphism-subtle p-2 rounded-2xl">
                    <div className="w-8 h-8 bg-glass-300 rounded-full opacity-50" />
                  </div>
                  <span className="text-text-tertiary">Select a supervisor</span>
                </>
              )}
            </div>
            {!disabled && (
              <Image
                src="/images/arrow-right-icon.svg"
                alt="Expand"
                width={16}
                height={16}
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </div>
        </GlassCard>

        {isExpanded && !disabled && (
          <div className="absolute top-full left-0 right-0 z-[9999] mt-2">
            <GlassCard variant="strong" className="p-2 max-h-64 overflow-y-auto scrollbar-glass dropdown-background">
              <div className="space-y-1">
                {sortedSupervisors.map((supervisor) => (
                  <div
                    key={supervisor.id}
                    className="p-3 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-glass-200"
                    onClick={() => {
                      setSelectedSupervisor(supervisor);
                      setIsExpanded(false);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Image
                        src={supervisor.photoUrl || '/images/default-avatar.svg'}
                        alt={supervisor.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover w-8 h-8"
                      />
                      <div>
                        <p className="font-medium text-text-primary text-sm">{supervisor.name}</p>
                         <p className="text-xs text-text-quaternary">{supervisor.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendingSelector;
