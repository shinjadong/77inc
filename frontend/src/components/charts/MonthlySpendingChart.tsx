'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MonthlyData {
  month: string;
  amount: number;
  count: number;
}

interface MonthlySpendingChartProps {
  data: MonthlyData[];
}

export function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}백만`;
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            지출: {formatCurrency(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              거래: {payload[1].value}건
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          className="fill-gray-500 dark:fill-gray-400"
          axisLine={{ className: 'stroke-gray-200 dark:stroke-gray-700' }}
          tickLine={{ className: 'stroke-gray-200 dark:stroke-gray-700' }}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          className="fill-gray-500 dark:fill-gray-400"
          axisLine={{ className: 'stroke-gray-200 dark:stroke-gray-700' }}
          tickLine={{ className: 'stroke-gray-200 dark:stroke-gray-700' }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12 }}
          className="fill-gray-500 dark:fill-gray-400"
          axisLine={{ className: 'stroke-gray-200 dark:stroke-gray-700' }}
          tickLine={{ className: 'stroke-gray-200 dark:stroke-gray-700' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: 10 }}
          formatter={(value) => <span className="text-gray-600 dark:text-gray-400">{value}</span>}
        />
        <Bar
          yAxisId="left"
          dataKey="amount"
          name="지출금액"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          yAxisId="right"
          dataKey="count"
          name="거래건수"
          fill="#93c5fd"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
