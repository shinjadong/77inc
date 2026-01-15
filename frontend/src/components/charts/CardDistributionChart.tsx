'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface CardData {
  name: string;
  amount: number;
  count: number;
  [key: string]: string | number;
}

interface CardDistributionChartProps {
  data: CardData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function CardDistributionChart({ data }: CardDistributionChartProps) {
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; payload: CardData }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            지출: {formatCurrency(item.amount)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            거래: {item.count}건
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="amount"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
