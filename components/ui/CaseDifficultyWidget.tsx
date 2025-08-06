// components/ui/CaseDifficultyWidget.tsx
import React from 'react';
import Image from 'next/image';
import { GlassCard, PillToggle } from '.';

interface Props {
  averageDifficulty: number;
  timeRange: 'all' | 'month' | 'week';
  setTimeRange: (range: 'all' | 'month' | 'week') => void;
}

const getDifficultyColor = (difficulty: number) => {
  const green = { r: 52, g: 199, b: 89 };
  const yellow = { r: 255, g: 204, b: 0 };
  const darkRed = { r: 192, g: 28, b: 40 };

  if (difficulty <= 1) return `rgb(${green.r}, ${green.g}, ${green.b})`;
  if (difficulty >= 3) return `rgb(${darkRed.r}, ${darkRed.g}, ${darkRed.b})`;

  let r, g, b;

  if (difficulty < 2) {
    const t = difficulty - 1;
    r = green.r + (yellow.r - green.r) * t;
    g = green.g + (yellow.g - green.g) * t;
    b = green.b + (yellow.b - green.b) * t;
  } else {
    const t = difficulty - 2;
    r = yellow.r + (darkRed.r - yellow.r) * t;
    g = yellow.g + (darkRed.g - yellow.g) * t;
    b = yellow.b + (darkRed.b - yellow.b) * t;
  }

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

const CaseDifficultyWidget: React.FC<Props> = ({ averageDifficulty, timeRange, setTimeRange }) => {
  const barColor = getDifficultyColor(averageDifficulty);
  const difficultyLabel = averageDifficulty < 1.5 ? 'Low' : averageDifficulty < 2.5 ? 'Medium' : 'High';

  return (
    <GlassCard variant="strong" className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
            <h3 className="heading-md">Avg. Case Difficulty</h3>
            <PillToggle
              options={[
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                  { id: 'all', label: 'All' },
              ]}
              value={timeRange}
              onChange={(id) => setTimeRange(id as 'all' | 'month' | 'week')}
            />
        </div>
        <div className="flex items-center gap-4 mt-6">
          <div className="glassmorphism-subtle p-3 rounded-2xl">
            <Image src="/images/difficulty-icon.svg" alt="Difficulty" width={28} height={28} />
          </div>
          <div>
            <p className="text-5xl font-bold text-white tracking-tight">
              {averageDifficulty > 0 ? averageDifficulty.toFixed(2) : 'N/A'}
            </p>
            <p className="text-sm text-text-tertiary" style={{ color: barColor }}>
              {averageDifficulty > 0 ? difficultyLabel : ''}
            </p>
          </div>
        </div>
      </div>
      <div className="w-full bg-glass-200 rounded-full h-2.5 mt-6">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${averageDifficulty > 0 ? (averageDifficulty / 3) * 100 : 0}%`, backgroundColor: barColor }}
        />
      </div>
    </GlassCard>
  );
};

export default CaseDifficultyWidget;