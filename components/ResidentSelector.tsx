import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { GlassCard } from './ui';

interface Resident {
  id: string;
  name: string;
  photoUrl?: string;
  year?: string;
}

interface Props {
  residents: Resident[];
  selected: Resident | null;
  setSelected: (resident: Resident | null) => void;
}

const ResidentSelector: React.FC<Props> = ({ residents, selected, setSelected }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef}>
      <label className="block mb-3 text-sm font-medium text-text-secondary">
        Filter by Resident
      </label>
      
      <div className="relative">
        <GlassCard 
          variant="subtle" 
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
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
                    <p className="text-xs text-text-quaternary">{selected.year || 'N/A'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="glassmorphism-subtle p-2 rounded-2xl">
                    <div className="w-8 h-8 bg-glass-300 rounded-full opacity-50" />
                  </div>
                  <span className="text-text-tertiary">Choose a resident</span>
                </>
              )}
            </div>
            
            <Image 
              src="/images/arrow-right-icon.svg" 
              alt="Expand" 
              width={16} 
              height={16}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </GlassCard>

        {isExpanded && (
          <div className="absolute top-full left-0 right-0 z-10 mt-2">
            <GlassCard variant="strong" className="p-2 max-h-64 overflow-y-auto scrollbar-glass dropdown-background">
              <div className="space-y-1">
                {residents.map((resident) => (
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
                        <p className="text-xs text-text-quaternary">{resident.year || 'N/A'}</p>
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