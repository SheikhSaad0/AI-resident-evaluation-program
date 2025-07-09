import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface Evaluation {
  date: string;
  score?: number;
  surgery: string;
}

interface PerformanceChartProps {
  evaluations: Evaluation[];
  timeRange?: 'week' | 'month' | '6M' | '1Y';
  procedureFilter?: string;
  height?: number;
  className?: string;
}

const aggregateData = (evaluations: Evaluation[], timeRange: 'week' | 'month' | '6M' | '1Y' = 'month', procedureFilter: string = 'all') => {
  const filteredEvals = evaluations.filter(e => e.score !== undefined && (procedureFilter === 'all' || e.surgery === procedureFilter));

  const now = new Date();
  let startDate = new Date();

  switch (timeRange) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '6M':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  const relevantEvals = filteredEvals.filter(e => new Date(e.date) >= startDate);

  const groupedData: { [key: string]: { scores: number[], count: number } } = {};

  relevantEvals.forEach(e => {
    const date = new Date(e.date);
    let key = '';

    if (timeRange === 'week' || timeRange === 'month') {
      key = date.toLocaleDateString();
    } else { // 6M or 1Y
      key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    }

    if (!groupedData[key]) {
      groupedData[key] = { scores: [], count: 0 };
    }
    groupedData[key].scores.push(e.score!);
    groupedData[key].count++;
  });

  return Object.entries(groupedData)
    .map(([date, { scores, count }]) => ({
      date,
      score: scores.reduce((a, b) => a + b, 0) / count,
      evaluations: count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};


export default function PerformanceChart({
  evaluations,
  timeRange = 'month',
  procedureFilter = 'all',
  height = 300,
  className = ''
}: PerformanceChartProps) {
  const data = aggregateData(evaluations, timeRange, procedureFilter);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glassmorphism-strong rounded-2xl p-3 border border-glass-border">
          <p className="text-text-primary font-medium">{label}</p>
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
            dataKey="date"
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