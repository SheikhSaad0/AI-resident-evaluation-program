import React from 'react';
import { GlassCard, PillToggle } from '.';

interface Props {
  averageTimeDifference: number; // in minutes
  timeRange: 'all' | 'month' | 'week';
  setTimeRange: (range: 'all' | 'month' | 'week') => void;
}

const getTimeColor = (difference: number) => {
  // Green for under time, red for over time.
  const green = { r: 52, g: 199, b: 89 };
  const red = { r: 192, g: 28, b: 40 };

  if (difference <= 0) return `rgb(${green.r}, ${green.g}, ${green.b})`;
  return `rgb(${red.r}, ${red.g}, ${red.b})`;
};

const CaseTimeWidget: React.FC<Props> = ({ averageTimeDifference, timeRange, setTimeRange }) => {
  const bgColor = getTimeColor(averageTimeDifference);
  const timeDifferenceText = averageTimeDifference > 0
    ? `+${averageTimeDifference.toFixed(2)} min`
    : `${averageTimeDifference.toFixed(2)} min`;

  return (
    <GlassCard variant="strong" className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
          <h3 className="heading-md">Avg. Case Time</h3>
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
      {/* Centering container for the pill */}
      <div className="flex-grow flex items-center justify-center">
        <div
          className="px-12 py-4 rounded-full transition-colors duration-500"
          style={{ backgroundColor: averageTimeDifference ? bgColor : 'transparent' }}
        >
          <p className="text-4xl font-black text-white" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>
              {averageTimeDifference ? timeDifferenceText : 'N/A'}
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

export default CaseTimeWidget;