'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { BarStat } from '@/components/charts/bar-stat';
import { Button } from '@/components/ui/button';
import { endpoints } from '@/lib/api';
import { fmtInt } from '@/lib/format';

export default function SegmentationPage() {
  return (
    <div>
      <PageHeader
        title="Segmentation"
        description="Slice the platform by geography, production type, and supplier."
      />

      <Tabs defaultValue="country">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="country">By country</TabsTrigger>
          <TabsTrigger value="state">By state</TabsTrigger>
          <TabsTrigger value="farm-type">By farm type</TabsTrigger>
          <TabsTrigger value="production">By primary production</TabsTrigger>
          <TabsTrigger value="market">By target market</TabsTrigger>
          <TabsTrigger value="flocks">Flocks by production</TabsTrigger>
          <TabsTrigger value="suppliers">Top breeds / hatcheries</TabsTrigger>
          <TabsTrigger value="mortality">Mortality by country</TabsTrigger>
        </TabsList>

        <TabsContent value="country">
          <ByCountry />
        </TabsContent>
        <TabsContent value="state">
          <ByState />
        </TabsContent>
        <TabsContent value="farm-type">
          <Generic title="Farm type" loader={endpoints.segByFarmType} xKey="bucket" yKey="farms" />
        </TabsContent>
        <TabsContent value="production">
          <Generic title="Primary production" loader={endpoints.segByPrimaryProduction} xKey="bucket" yKey="farms" />
        </TabsContent>
        <TabsContent value="market">
          <Generic title="Target market" loader={endpoints.segByTargetMarket} xKey="bucket" yKey="farms" />
        </TabsContent>
        <TabsContent value="flocks">
          <Generic
            title="Flocks by production type"
            loader={endpoints.segFlocksByProduction}
            xKey="productionType"
            yKey="flocks"
          />
        </TabsContent>
        <TabsContent value="suppliers">
          <Suppliers />
        </TabsContent>
        <TabsContent value="mortality">
          <Mortality />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ByCountry() {
  const q = useQuery({ queryKey: ['seg-country'], queryFn: () => endpoints.segByCountry() });
  if (q.isLoading) return <Skeleton className="h-72" />;
  const rows = q.data?.rows ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Farms per country</CardTitle>
            <CardDescription>Active and archived combined.</CardDescription>
          </div>
        </CardHeader>
        <BarStat
          data={rows.map((r) => ({ label: String(r.countryCode), farms: Number(r.farms) }))}
          xKey="label"
          yKey="farms"
        />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Country</TH>
              <TH>Farms</TH>
              <TH>Flocks</TH>
              <TH>Birds</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={String(r.countryCode)}>
                <TD>{String(r.countryCode)}</TD>
                <TD>{fmtInt(Number(r.farms))}</TD>
                <TD>{fmtInt(Number(r.activeFlocks))}</TD>
                <TD>{fmtInt(Number(r.currentBirds))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function ByState() {
  const [country, setCountry] = useState('NG');
  const q = useQuery({
    queryKey: ['seg-state', country],
    queryFn: () => endpoints.segByState(country || undefined),
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>States within a country</CardTitle>
          <CardDescription>Filter by ISO country code.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="NG"
            className="w-24"
          />
          <Button variant="secondary" onClick={() => q.refetch()}>Refresh</Button>
        </div>
      </CardHeader>
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>State</TH>
              <TH>Farms</TH>
              <TH>Accounts</TH>
              <TH>Active flocks</TH>
              <TH>Birds</TH>
            </TR>
          </THead>
          <TBody>
            {(q.data?.rows ?? []).map((r) => (
              <TR key={`${r.countryCode}-${r.state}`}>
                <TD>{String(r.state)}</TD>
                <TD>{fmtInt(Number(r.farms))}</TD>
                <TD>{fmtInt(Number(r.accounts))}</TD>
                <TD>{fmtInt(Number(r.activeFlocks))}</TD>
                <TD>{fmtInt(Number(r.currentBirds))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

interface GenericProps {
  title: string;
  loader: () => Promise<{ rows: Record<string, string | number | null>[] }>;
  xKey: string;
  yKey: string;
}

function Generic({ title, loader, xKey, yKey }: GenericProps) {
  const q = useQuery({ queryKey: ['seg', title], queryFn: () => loader() });
  if (q.isLoading) return <Skeleton className="h-72" />;
  const rows = q.data?.rows ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <BarStat
        data={rows.map((r) => ({
          ...r,
          [xKey]: r[xKey] ?? '(none)',
        }))}
        xKey={xKey}
        yKey={yKey}
      />
    </Card>
  );
}

function Suppliers() {
  const q = useQuery({
    queryKey: ['seg-suppliers'],
    queryFn: () => endpoints.segTopBreedsAndHatcheries(10),
  });
  if (q.isLoading) return <Skeleton className="h-72" />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top breeds in active flocks</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Breed</TH>
              <TH>Production</TH>
              <TH>Flocks</TH>
              <TH>Birds</TH>
            </TR>
          </THead>
          <TBody>
            {(q.data?.breeds ?? []).map((r, i) => (
              <TR key={`${r.name}-${i}`}>
                <TD>{String(r.name)}</TD>
                <TD className="capitalize">{r.productionType ? String(r.productionType) : '—'}</TD>
                <TD>{fmtInt(Number(r.flocks))}</TD>
                <TD>{fmtInt(Number(r.currentBirds))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top hatcheries</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Hatchery</TH>
              <TH>Country</TH>
              <TH>Flocks</TH>
              <TH>Placed</TH>
            </TR>
          </THead>
          <TBody>
            {(q.data?.hatcheries ?? []).map((r, i) => (
              <TR key={`${r.name}-${i}`}>
                <TD>{String(r.name)}</TD>
                <TD>{r.country ? String(r.country) : '—'}</TD>
                <TD>{fmtInt(Number(r.flocks))}</TD>
                <TD>{fmtInt(Number(r.placedBirds))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function Mortality() {
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ['seg-mortality', days],
    queryFn: () => endpoints.segMortalityByCountry(days),
  });
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Mortality by country</CardTitle>
          <CardDescription>Mortality, sales, and bird-count reductions over the window.</CardDescription>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
        >
          {[7, 14, 30, 60, 90, 180, 365].map((d) => (
            <option key={d} value={d}>{d} days</option>
          ))}
        </select>
      </CardHeader>
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Country</TH>
              <TH>Mortality</TH>
              <TH>Sales</TH>
              <TH>Bird-count reductions</TH>
            </TR>
          </THead>
          <TBody>
            {(q.data?.rows ?? []).map((r) => (
              <TR key={String(r.countryCode)}>
                <TD>{String(r.countryCode)}</TD>
                <TD className="font-medium text-[var(--color-brand-danger)]">{fmtInt(Number(r.mortality))}</TD>
                <TD>{fmtInt(Number(r.sales))}</TD>
                <TD>{fmtInt(Number(r.birdCountReductions))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
