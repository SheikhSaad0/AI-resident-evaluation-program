import React from 'react';
import { GlassCard, PillToggle } from '.';

interface Props {
  averageDifficulty: number;
  timeRange: 'all' | 'month' | 'week';
  setTimeRange: (range: 'all' | 'month' | 'week') => void;
}

const getDifficultyColor = (difficulty: number) => {
  // Define key colors for the gradient
  const green = { r: 52, g: 199, b: 89 };   // Corresponds to difficulty 1
  const yellow = { r: 255, g: 204, b: 0 };  // Corresponds to difficulty 2
  const darkRed = { r: 192, g: 28, b: 40 }; // Corresponds to difficulty 3

  if (difficulty <= 1) return `rgb(${green.r}, ${green.g}, ${green.b})`;
  if (difficulty >= 3) return `rgb(${darkRed.r}, ${darkRed.g}, ${darkRed.b})`;

  let r, g, b;

  if (difficulty < 2) {
    // Interpolate between green (1) and yellow (2)
    const t = difficulty - 1;
    r = green.r + (yellow.r - green.r) * t;
    g = green.g + (yellow.g - green.g) * t;
    b = green.b + (yellow.b - green.b) * t;
  } else {
    // Interpolate between yellow (2) and dark red (3)
    const t = difficulty - 2;
    r = yellow.r + (darkRed.r - yellow.r) * t;
    g = yellow.g + (darkRed.g - yellow.g) * t;
    b = yellow.b + (darkRed.b - yellow.b) * t;
  }

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

const CaseDifficultyWidget: React.FC<Props> = ({ averageDifficulty, timeRange, setTimeRange }) => {
  const bgColor = getDifficultyColor(averageDifficulty);
  return (
    <GlassCard variant="strong" className="p-6 h-full flex flex-col">
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
      <div 
        className="flex-grow flex items-center justify-center rounded-3xl transition-colors duration-500"
        style={{ backgroundColor: averageDifficulty > 0 ? bgColor : 'transparent' }}
       >
        <p className="text-6xl font-black text-white" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>
            {averageDifficulty > 0 ? averageDifficulty.toFixed(2) : 'N/A'}
        </p>
      </div>
    </GlassCard>
  );
};

export default CaseDifficultyWidget;