import React from 'react';
import Image from 'next/image';
import GlassCard from './GlassCard';

interface ProcedurePerformance {
  name: string;
  score: number;
}

interface Props {
  procedures: ProcedurePerformance[];
}

const getBarColor = (score: number) => {
  if (score < 2) return 'bg-red-600'; // Dark Red for scores < 2
  if (score < 3) return 'bg-orange-500'; // Orange-Red for scores < 3
  if (score < 3.7) return 'bg-yellow-400'; // Yellow for scores < 3.7
  if (score < 4) return 'bg-lime-400'; // Yellow-Green for scores < 4
  return 'bg-green-500'; // Green for scores 4+
};

const getSurgeryIcon = (s: string) => {
    if (s.toLowerCase().includes('cholecyst')) return '/images/galbladderArt.png';
    if (s.toLowerCase().includes('appendic')) return '/images/appendectomyArt.png';
    if (s.toLowerCase().includes('inguinal')) return '/images/herniaArt.png';
    if (s.toLowerCase().includes('ventral')) return '/images/herniaArt.png';
    return '/images/default-avatar.svg';
};

const LowestProceduresWidget: React.FC<Props> = ({ procedures }) => {
  const maxScore = 5;

  return (
    <GlassCard variant="strong" className="p-6 h-full">
      <h3 className="heading-md mb-6">Lowest Scoring Procedures</h3>
      <div className="flex justify-around items-end h-full pt-4 min-h-[300px]">
        {procedures.length > 0 ? (
            procedures.slice(0, 3).map((proc, index) => (
            <div key={index} className="flex flex-col items-center w-1/3 px-2">
                <p className="text-2xl font-bold text-text-primary">{proc.score.toFixed(1)}</p>
                <div className="w-16 h-64 bg-glass-300 rounded-2xl overflow-hidden flex flex-col-reverse mt-2">
                <div
                    className={`w-full ${getBarColor(proc.score)} transition-all duration-500`}
                    style={{ height: `${(proc.score / maxScore) * 100}%` }}
                />
                </div>
                <div className="mt-4 text-center">
                <Image src={getSurgeryIcon(proc.name)} alt={proc.name} width={48} height={48} className="mx-auto" />
                <p className="text-sm font-medium text-text-secondary mt-2 h-10">{proc.name}</p>
                </div>
            </div>
            ))
        ) : (
            <div className="text-center w-full self-center">
                <div className="glassmorphism-subtle p-6 rounded-3xl w-fit mx-auto mb-4">
                    <Image src="/images/dashboard-icon.svg" alt="No data" width={32} height={32} className="opacity-50" />
                </div>
                <p className="text-text-tertiary">Not enough data</p>
                <p className="text-text-quaternary text-sm">Finalize evaluations to see procedure performance.</p>
            </div>
        )}
      </div>
    </GlassCard>
  );
};

export default LowestProceduresWidget;