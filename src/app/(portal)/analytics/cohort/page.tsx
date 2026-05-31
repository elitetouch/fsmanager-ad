'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { endpoints } from '@/lib/api';
import { fmtInt } from '@/lib/format';

export default function CohortPage() {
  const [months, setMonths] = useState(12);

  const q = useQuery({
    queryKey: ['cohort-retention', { months }],
    queryFn: () => endpoints.cohortRetention(months),
  });

  const cohorts = q.data?.cohorts ?? [];
  const maxOffset = cohorts.reduce((acc, c) => Math.max(acc, ...c.series.map((s) => s.monthOffset)), 0);
  const indices = Array.from({ length: maxOffset + 1 }, (_, i) => i);

  return (
    <div>
      <PageHeader
        title="Cohort retention"
        description="How well do users from each signup month stick around? Read each row left-to-right to see drop-off over time."
        actions={
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        }
      />

      {q.isLoading ? (
        <Card><Skeleton className="h-80" /></Card>
      ) : cohorts.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No cohort data yet" description="Cohorts appear once users have been signing up for at least one month." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--color-brand-bg)] text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--color-brand-bg)] px-4 py-3 text-left">Cohort</th>
                <th className="px-3 py-3 text-right">Signups</th>
                {indices.map((i) => <th key={i} className="px-3 py-3 text-center">M{i}</th>)}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohortMonth} className="border-t border-[var(--color-brand-border)]">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium">{c.cohortMonth}</td>
                  <td className="px-3 py-2 text-right">{fmtInt(c.signups)}</td>
                  {indices.map((i) => {
                    const cell = c.series.find((s) => s.monthOffset === i);
                    if (!cell) return <td key={i} className="px-3 py-2 text-center text-[var(--color-brand-muted)]">—</td>;
                    return (
                      <td
                        key={i}
                        className="px-3 py-2 text-center"
                        style={{ backgroundColor: heatColor(cell.pct / 100) }}
                        title={`${fmtInt(cell.active)} active users in ${cell.monthLabel}`}
                      >
                        <strong>{cell.pct}%</strong>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function heatColor(rate: number): string {
  const clamped = Math.max(0, Math.min(1, rate));
  const alpha = 0.12 + clamped * 0.65;
  return `rgba(46, 125, 50, ${alpha.toFixed(2)})`;
}
