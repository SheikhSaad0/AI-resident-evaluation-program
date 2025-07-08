import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { GlassCard } from './ui';

const surgeries = [
  {
    name: 'Laparoscopic Inguinal Hernia Repair with Mesh (TEP)',
    icon: '/images/inguinalHerniaArt.svg',
    shortName: 'Inguinal Hernia TEP'
  },
  {
    name: 'Laparoscopic Cholecystectomy',
    icon: '/images/galbladderArt.png',
    shortName: 'Laparoscopic Cholecystectomy'
  },
  {
    name: 'Robotic Cholecystectomy',
    icon: '/images/galbladderArt.png',
    shortName: 'Robotic Cholecystectomy'
  },
  {
    name: 'Robotic Assisted Laparoscopic Inguinal Hernia Repair (TAPP)',
    icon: '/images/inguinalHerniaArt.svg',
    shortName: 'Inguinal Hernia TAPP'
  },
  {
    name: 'Robotic Lap Ventral Hernia Repair (TAPP)',
    icon: '/images/ventralHerniaArt.svg',
    shortName: 'Ventral Hernia Repair'
  },
  {
    name: 'Laparoscopic Appendicectomy',
    icon: '/images/appendectomyArt.png',
    shortName: 'Laparoscopic Appendicectomy'
  }
];

interface Props {
  selected: string;
  setSelected: (val: string) => void;
}

const SurgerySelector: React.FC<Props> = ({ selected, setSelected }) => {
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

  const selectedSurgery = surgeries.find(s => s.name === selected);

  return (
    <div ref={containerRef}>
      <label className="block mb-3 text-sm font-medium text-text-secondary">
        Select Surgery Type
      </label>
      
      <div className="relative">
        <GlassCard 
          variant="subtle" 
          className="p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedSurgery ? (
                <>
                  <Image 
                    src={selectedSurgery.icon} 
                    alt={selectedSurgery.shortName} 
                    width={32} 
                    height={32}
                    className="opacity-80"
                  />
                  <div>
                    <p className="font-medium text-text-primary">{selectedSurgery.shortName}</p>
                    <p className="text-xs text-text-quaternary">{selectedSurgery.name}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="glassmorphism-subtle p-2 rounded-2xl">
                    <div className="w-6 h-6 bg-glass-300 rounded-lg opacity-50" />
                  </div>
                  <span className="text-text-tertiary">Choose a procedure</span>
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
            <GlassCard variant="strong" className="p-2 max-h-64 overflow-y-auto scrollbar-glass">
              <div className="space-y-1">
                {surgeries.map((surgery) => (
                  <div
                    key={surgery.name}
                    className="p-3 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-glass-200"
                    onClick={() => {
                      setSelected(surgery.name);
                      setIsExpanded(false);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Image 
                        src={surgery.icon} 
                        alt={surgery.shortName} 
                        width={24} 
                        height={24}
                        className="opacity-80"
                      />
                      <div>
                        <p className="font-medium text-text-primary text-sm">{surgery.shortName}</p>
                        <p className="text-xs text-text-quaternary">{surgery.name}</p>
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

export default SurgerySelector;