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
  LabelList,
} from 'recharts';

interface MatchingData {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface MatchingStatusChartProps {
  data: MatchingData[];
}

export function MatchingStatusChart({ data }: MatchingStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: MatchingData }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {item.count}건 ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          className="fill-gray-500 dark:fill-gray-400"
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12 }}
          className="fill-gray-500 dark:fill-gray-400"
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            formatter={(value) => `${value}건`}
            className="fill-gray-700 dark:fill-gray-300"
            style={{ fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
