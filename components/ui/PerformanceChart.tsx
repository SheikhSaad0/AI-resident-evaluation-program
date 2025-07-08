import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

// Mock data for resident performance over time
const generatePerformanceData = (residentName?: string) => {
  const baseData = [
    { month: 'Jan', score: 3.2, evaluations: 2 },
    { month: 'Feb', score: 3.6, evaluations: 3 },
    { month: 'Mar', score: 3.8, evaluations: 4 },
    { month: 'Apr', score: 4.1, evaluations: 3 },
    { month: 'May', score: 4.3, evaluations: 5 },
    { month: 'Jun', score: 4.5, evaluations: 4 },
  ];
  
  // Add some variation based on resident name if provided
  if (residentName) {
    return baseData.map(item => ({
      ...item,
      score: Math.max(1, Math.min(5, item.score + (Math.random() - 0.5) * 0.5))
    }));
  }
  
  return baseData;
};

interface PerformanceChartProps {
  residentName?: string;
  height?: number;
  className?: string;
}

export default function PerformanceChart({ 
  residentName, 
  height = 300, 
  className = '' 
}: PerformanceChartProps) {
  const data = generatePerformanceData(residentName);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glassmorphism-strong rounded-2xl p-3 border border-glass-border">
          <p className="text-text-primary font-medium">{`${label} 2024`}</p>
          <p className="text-brand-primary">
            Score: <span className="font-semibold">{payload[0].value.toFixed(1)}/5.0</span>
          </p>
          <p className="text-text-tertiary text-sm">
            {payload[0].payload.evaluations} evaluations
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="month" 
            stroke="rgba(255,255,255,0.6)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[1, 5]} 
            stroke="rgba(255,255,255,0.6)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}.0`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="url(#chartGradient)" 
            strokeWidth={3}
            dot={{ fill: '#007AFF', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, fill: '#30D0C4' }}
          />
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#007AFF" />
              <stop offset="100%" stopColor="#30D0C4" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}