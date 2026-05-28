'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { brand } from '@/config/brand';
import { fmtDate } from '@/lib/format';

interface Props {
  data: { date: string; count: number }[];
  color?: string;
  height?: number;
}

export function TrendChart({ data, color = brand.colors.primary, height = 220 }: Props) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={brand.colors.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => fmtDate(v).split(' ').slice(0, 2).join(' ')}
            tick={{ fontSize: 11, fill: brand.colors.muted }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: brand.colors.muted }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: `1px solid ${brand.colors.border}`,
              fontSize: 12,
            }}
            labelFormatter={(v) => fmtDate(v as string)}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            fill="url(#trendGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
