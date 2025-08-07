// components/ui/ImprovementWidget.tsx
import React from 'react';
import Image from 'next/image';
import { GlassCard } from '.';

interface Props {
  improvement: number; // The calculated improvement percentage
}

const getImprovementInfo = (improvement: number) => {
  if (improvement > 10) return { color: '#34C759', label: 'Excellent Progress' }; // Green
  if (improvement > 0) return { color: '#30D0C4', label: 'Steady Improvement' }; // Teal
  if (improvement === 0) return { color: '#9CA3AF', label: 'Consistent' }; // Gray
  if (improvement > -10) return { color: '#FF9500', label: 'Needs Review' }; // Orange
  return { color: '#FF3B30', label: 'Action Recommended' }; // Red
};

const ImprovementWidget: React.FC<Props> = ({ improvement }) => {
  const { color, label } = getImprovementInfo(improvement);
  const isPositive = improvement >= 0;

  return (
    <GlassCard variant="strong" className="p-6 h-full flex flex-col justify-between">
      <div>
        <h3 className="heading-md mb-4">Performance Trend (14d)</h3>
        <div className="flex items-center gap-4 mt-6">
          <div className="glassmorphism-subtle p-3 rounded-2xl">
            <Image src="/images/improve-icon.svg" alt="Improvement" width={40} height={40} />
          </div>
          <div>
            <p className="text-5xl font-bold tracking-tight" style={{ color }}>
              {isPositive ? '+' : ''}{improvement.toFixed(1)}%
            </p>
            <p className="text-sm font-medium" style={{ color }}>
              {label}
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs text-text-quaternary mt-4">
        This trend is calculated based on difficulty-weighted scores over the last 14 days.
      </p>
    </GlassCard>
  );
};

export default ImprovementWidget;