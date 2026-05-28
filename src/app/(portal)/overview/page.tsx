'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Coins,
  Egg,
  MessageSquareText,
  Tractor,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { TrendChart } from '@/components/charts/trend-chart';
import { BarStat } from '@/components/charts/bar-stat';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { endpoints } from '@/lib/api';
import { fmtInt, fmtMinor, fmtRelative } from '@/lib/format';
import { brand } from '@/config/brand';

export default function OverviewPage() {
  const snap = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => endpoints.dashboard(),
    refetchInterval: 60_000,
  });

  const trends = useQuery({
    queryKey: ['trends', 30],
    queryFn: () => endpoints.trends(30),
  });

  const s = snap.data;
  const series = trends.data?.series;

  return (
    <div>
      <PageHeader
        title="Operations dashboard"
        description={
          s
            ? `Live as of ${fmtRelative(s.generatedAt)}. Polled every minute.`
            : 'Loading platform snapshot…'
        }
        actions={
          <span className="rounded-full border border-[var(--color-brand-border)] bg-white px-3 py-1 text-xs text-[var(--color-brand-muted)]">
            Window · last 30 days
          </span>
        }
      />

      {/* --- TOP KPI ROW --- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {snap.isLoading || !s ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <KpiCard
              label="Users"
              value={fmtInt(s.totals.users)}
              hint={`${fmtInt(s.totals.verifiedUsers)} verified · ${fmtInt(s.growth.usersThisMonth)} this month`}
              icon={Users}
              accent="primary"
            />
            <KpiCard
              label="Active farms"
              value={fmtInt(s.totals.activeFarms)}
              hint={`${fmtInt(s.engagement.activeFarmsLast30d)} active in 30d`}
              icon={Tractor}
              accent="info"
            />
            <KpiCard
              label="Birds in production"
              value={fmtInt(s.totals.currentBirds)}
              hint={`${fmtInt(s.totals.placedBirdsAllTime)} placed all-time`}
              icon={Egg}
              accent="accent"
            />
            <KpiCard
              label="Active flocks"
              value={fmtInt(s.totals.activeFlocks)}
              hint={`${fmtInt(s.growth.flocksThisMonth)} new this month`}
              icon={Activity}
              accent="success"
            />
          </>
        )}
      </div>

      {/* --- SECONDARY KPI ROW --- */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {snap.isLoading || !s ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <KpiCard
              label="Revenue (month)"
              value={fmtMinor(s.tokens.revenueMonthMinor, 'NGN')}
              hint={`${fmtInt(s.tokens.successfulPurchasesMonth)} successful · ${fmtInt(s.tokens.failedPurchasesMonth)} failed`}
              icon={Wallet}
              accent="primary"
            />
            <KpiCard
              label="Tokens consumed 30d"
              value={fmtInt(s.tokens.tokensConsumedLast30d)}
              hint={`Issued: ${fmtInt(s.tokens.tokensIssuedLast30d)}`}
              icon={Coins}
              accent="accent"
            />
            <KpiCard
              label="Open support threads"
              value={fmtInt(s.support.openThreads)}
              hint={`${fmtInt(s.support.messagesLast30d)} messages in 30d`}
              icon={MessageSquareText}
              accent="warning"
            />
            <KpiCard
              label="Active users 30d"
              value={fmtInt(s.engagement.activeUsersLast30d)}
              hint={`${fmtInt(s.growth.dailyRecordsLast30d)} daily records logged`}
              icon={UserCheck}
              accent="info"
            />
          </>
        )}
      </div>

      {/* --- TRENDS --- */}
      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Platform trends</CardTitle>
            <CardDescription>Daily series. Switch tabs to slice the same window.</CardDescription>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-muted)]">
            <TrendingUp className="h-3 w-3" /> 30-day window
          </span>
        </CardHeader>

        <Tabs defaultValue="userSignups">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="userSignups">User sign-ups</TabsTrigger>
            <TabsTrigger value="farmCreations">Farm creations</TabsTrigger>
            <TabsTrigger value="flockPlacements">Flock placements</TabsTrigger>
            <TabsTrigger value="dailyRecords">Daily records</TabsTrigger>
            <TabsTrigger value="mortalityEvents">Mortality</TabsTrigger>
            <TabsTrigger value="tokenPurchases">Token purchases</TabsTrigger>
          </TabsList>

          {(['userSignups', 'farmCreations', 'flockPlacements', 'dailyRecords', 'mortalityEvents', 'tokenPurchases'] as const).map(
            (key, idx) => (
              <TabsContent key={key} value={key}>
                {trends.isLoading || !series ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  <TrendChart
                    data={series[key]}
                    color={brand.chart[idx % brand.chart.length]}
                  />
                )}
              </TabsContent>
            ),
          )}
        </Tabs>
      </Card>

      {/* --- TWO COLUMN: TOKEN BALANCES + SUPPORT SNAPSHOT --- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Token balances by type</CardTitle>
              <CardDescription>Across every active account.</CardDescription>
            </div>
          </CardHeader>
          {snap.isLoading || !s ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <BarStat
              data={s.tokens.totalBalancesByType.map((row) => ({
                label: `${row.tokenType ?? '—'} ${row.tier ?? ''}`,
                total: row.total,
              }))}
              xKey="label"
              yKey="total"
            />
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Support inbox</CardTitle>
              <CardDescription>Snapshot of in-house messaging.</CardDescription>
            </div>
          </CardHeader>
          {snap.isLoading || !s ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ul className="divide-y divide-[var(--color-brand-border)]">
              {Object.entries(s.support.byStatus).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between py-2 text-sm">
                  <span className="capitalize text-[var(--color-brand-muted)]">
                    {status.replace('_', ' ')}
                  </span>
                  <strong className="text-[var(--color-brand-fg)]">{fmtInt(count)}</strong>
                </li>
              ))}
              <li className="flex items-center justify-between pt-3 text-sm font-medium">
                <span>Resolved last 30 days</span>
                <strong>{fmtInt(s.support.resolvedLast30d)}</strong>
              </li>
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
