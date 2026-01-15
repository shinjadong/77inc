'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface IndustryData {
  industry: string;
  amount: number;
  count: number;
}

interface IndustryChartProps {
  data: IndustryData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function IndustryChart({ data }: IndustryChartProps) {
  const sortedData = [...data].sort((a, b) => b.amount - a.amount).slice(0, 8);

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}백만`;
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: IndustryData }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{item.industry}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {formatCurrency(item.amount)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {item.count}건
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          className="fill-gray-500 dark:fill-gray-400"
        />
        <YAxis
          type="category"
          dataKey="industry"
          tick={{ fontSize: 12 }}
          className="fill-gray-500 dark:fill-gray-400"
          width={90}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
          {sortedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
