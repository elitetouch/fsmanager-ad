'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { brand } from '@/config/brand';

interface Props {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}

export function BarStat({ data, xKey, yKey, color = brand.colors.primary, height = 260 }: Props) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={brand.colors.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: brand.colors.muted }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: brand.colors.muted }} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${brand.colors.border}`,
              fontSize: 12,
            }}
          />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
