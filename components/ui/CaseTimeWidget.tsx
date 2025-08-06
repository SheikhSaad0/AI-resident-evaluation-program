// components/ui/CaseTimeWidget.tsx
import React from 'react';
import Image from 'next/image';
import { GlassCard, PillToggle } from '.';

type TimeRangeOptions = 'all' | 'month' | 'week';

interface Props {
  averageCaseTime: number; // in minutes
  timeRange: string;
  setTimeRange?: (range: TimeRangeOptions) => void;
}

const getTimeInfo = (difference: number) => {
  if (difference === 0) {
    return { color: '#9CA3AF', label: 'On Time' }; // Gray
  }
  
  // Green for under time, red for over time.
  const green = { r: 52, g: 199, b: 89 };
  const red = { r: 192, g: 28, b: 40 };

  const isOver = difference > 0;
  const absDifference = Math.abs(difference);
  
  // Simple linear scale for color, capped at 15 mins for max color intensity
  const t = Math.min(absDifference / 15, 1); 
  const color = isOver
    ? `rgb(${Math.round(255 - (255 - red.r) * t)}, ${Math.round(255 - (255 - red.g) * t)}, ${Math.round(255 - (255 - red.b) * t)})`
    : `rgb(${Math.round(255 - (255 - green.r) * t)}, ${Math.round(255 - (255 - green.g) * t)}, ${Math.round(255 - (255 - green.b) * t)})`;
  
  return {
    color: color,
    label: isOver ? 'Over' : 'Under'
  };
};

const CaseTimeWidget: React.FC<Props> = ({ averageCaseTime, timeRange, setTimeRange }) => {
  const { color, label } = getTimeInfo(averageCaseTime);

  const timeDifferenceText = averageCaseTime > 0
    ? `+${averageCaseTime.toFixed(1)} min`
    : `${averageCaseTime.toFixed(1)} min`;

  return (
    <GlassCard variant="strong" className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
            <h3 className="heading-md">Avg. Case Time</h3>
            {setTimeRange && (
              <PillToggle
                options={[
                    { id: 'week', label: 'Week' },
                    { id: 'month', label: 'Month' },
                    { id: 'all', label: 'All' },
                ]}
                value={timeRange}
                onChange={(id) => setTimeRange(id as TimeRangeOptions)}
              />
            )}
        </div>
        <div className="flex items-center gap-4 mt-6">
          <div className="glassmorphism-subtle p-3 rounded-2xl">
            <Image src="/images/clock-image.svg" alt="Time" width={40} height={40} />
          </div>
          <div>
            <p className="text-5xl font-bold text-white tracking-tight">
                {averageCaseTime ? timeDifferenceText : 'N/A'}
            </p>
            <p className="text-sm text-text-tertiary" style={{ color }}>
              {averageCaseTime ? label : ''}
            </p>
          </div>
        </div>
      </div>
      <div className="w-full bg-glass-200 rounded-full h-2.5 mt-6">
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(Math.abs(averageCaseTime) / 15, 1) * 100}%`, backgroundColor: color }}
        />
      </div>
    </GlassCard>
  );
};

export default CaseTimeWidget;