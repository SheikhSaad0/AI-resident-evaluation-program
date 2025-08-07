import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { GlassCard } from './ui';

export interface Resident {
  id: string;
  name: string;
  photoUrl?: string | null;
  year?: string;
}

interface Props {
  residents: Resident[];
  selected: Resident | null;
  setSelected: (resident: Resident | null) => void;
  disabled?: boolean;
}

const ResidentSelector: React.FC<Props> = ({ residents, selected, setSelected, disabled }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedResidents = [...residents].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const placeholderText = disabled ? "Unlock to edit resident" : "Filter by Resident";

  return (
    <div ref={containerRef} className="relative z-50">
      <label className="block mb-3 text-sm font-medium text-text-secondary">
        Filter by Resident
      </label>
      <div className="relative">
        <GlassCard
          variant="subtle"
          className={`p-4 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
          onClick={() => !disabled && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selected ? (
                <>
                  <Image
                    src={selected.photoUrl || '/images/default-avatar.svg'}
                    alt={selected.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover w-8 h-8"
                  />
                  <div>
                    <p className="font-medium text-text-primary">{selected.name}</p>
                    <p className="text-xs text-text-quaternary">{selected.year}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="glassmorphism-subtle p-2 rounded-2xl">
                    <div className="w-8 h-8 bg-glass-300 rounded-full opacity-50" />
                  </div>
                  <span className="text-text-tertiary">{placeholderText}</span>
                </>
              )}
            </div>
            {/* If a resident is selected, show a clear button ('x') */}
            {selected && !disabled ? (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevents the dropdown from opening
                  setSelected(null);
                  setIsExpanded(false);
                }}
                className="p-1 rounded-full hover:bg-glass-200 transition-colors"
                aria-label="Clear resident filter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-text-tertiary">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            ) : !disabled && (
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
                {/* Add an "All Residents" option to clear the filter */}
                <div
                  className="p-3 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-glass-200"
                  onClick={() => {
                    setSelected(null);
                    setIsExpanded(false);
                  }}
                >
                  <p className="font-medium text-text-primary text-sm">All Residents</p>
                </div>

                {sortedResidents.map((resident) => (
                  <div
                    key={resident.id}
                    className="p-3 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-glass-200"
                    onClick={() => {
                      setSelected(resident);
                      setIsExpanded(false);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Image
                        src={resident.photoUrl || '/images/default-avatar.svg'}
                        alt={resident.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover w-8 h-8"
                      />
                      <div>
                        <p className="font-medium text-text-primary text-sm">{resident.name}</p>
                        <p className="text-xs text-text-quaternary">{resident.year}</p>
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

export default ResidentSelector;
