// components/ui/CaseTimeWidget.tsx
import React from 'react';
import { GlassCard, PillToggle } from '.';

type TimeRangeOptions = 'all' | 'month' | 'week';

interface Props {
  averageCaseTime: number; // in minutes
  timeRange: string;
  setTimeRange?: (range: TimeRangeOptions) => void;
}

const getTimeColor = (difference: number) => {
  // Green for under time, red for over time.
  const green = { r: 52, g: 199, b: 89 };
  const red = { r: 192, g: 28, b: 40 };

  // if the resident is finishing 10 minutes earlier than the average
  if (difference <= -10) return `rgb(${green.r}, ${green.g}, ${green.b})`;
  // if the resident is finishing 5 minutes later than the average
  return `rgb(${red.r}, ${red.g}, ${red.b})`;
};

const CaseTimeWidget: React.FC<Props> = ({ averageCaseTime, timeRange, setTimeRange }) => {
  const bgColor = getTimeColor(averageCaseTime);
  const timeDifferenceText = averageCaseTime > 0
    ? `+${averageCaseTime.toFixed(2)} min`
    : `${averageCaseTime.toFixed(2)} min`;

  return (
    <GlassCard variant="strong" className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
          <h3 className="heading-md">Avg. Case Time</h3>
          {/* Conditionally render the PillToggle if setTimeRange is provided */}
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
      {/* Centering container for the pill */}
      <div className="flex-grow flex items-center justify-center">
        <div
          className="px-12 py-4 rounded-full transition-colors duration-500"
          style={{ backgroundColor: averageCaseTime ? bgColor : 'transparent' }}
        >
          <p className="text-4xl font-black text-white" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>
              {averageCaseTime ? timeDifferenceText : 'N/A'}
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

export default CaseTimeWidget;