
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { FinancialItem } from '../types';

interface ComparisonChartProps {
  data: FinancialItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-gray-700 border border-gray-600 rounded-md shadow-lg">
        <p className="label font-bold text-white">{`${label}`}</p>
        <p className="text-sky-400">{`2025: ${payload[0].value.toLocaleString()}`}</p>
        <p className="text-teal-400">{`2024: ${payload[1].value.toLocaleString()}`}</p>
      </div>
    );
  }

  return null;
};

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <BarChart
                data={data}
                margin={{
                    top: 5,
                    right: 20,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="item" tick={{ fill: '#A0AEC0' }} />
                <YAxis tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} tick={{ fill: '#A0AEC0' }} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(127, 212, 255, 0.1)'}}/>
                <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                <Bar dataKey="amount2025" fill="#38bdf8" name="2025" />
                <Bar dataKey="amount2024" fill="#2dd4bf" name="2024" />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ComparisonChart;