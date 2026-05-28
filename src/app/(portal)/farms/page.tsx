'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, Tractor } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { endpoints } from '@/lib/api';
import { fmtInt } from '@/lib/format';

export default function FarmsPage() {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [farmType, setFarmType] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['farms', { q, country, farmType, status, page }],
    queryFn: () =>
      endpoints.listFarms({
        q: q || undefined,
        country_code: country || undefined,
        farm_type: farmType || undefined,
        status,
        page,
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader title="Farms" description="Every farm operating on the platform." />

      <Card className="mb-4">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by farm name or address…"
              className="pl-9"
            />
          </div>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="Country"
            className="sm:w-32"
          />
          <select
            value={farmType}
            onChange={(e) => setFarmType(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any farm type</option>
            <option value="broiler">Broiler</option>
            <option value="layer">Layer</option>
            <option value="mixed">Mixed</option>
            <option value="breeder">Breeder</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'archived')}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      {isLoading && !data ? (
        <Card>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="mb-2 h-10" />
          ))}
        </Card>
      ) : data?.farms.length === 0 ? (
        <EmptyState icon={Tractor} title="No farms match these filters" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Farm</TH>
                <TH>Location</TH>
                <TH>Production</TH>
                <TH>Active flocks</TH>
                <TH>Current birds</TH>
                <TH>Staff</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {data?.farms.map((f) => (
                <TR key={f.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      {f.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.logoUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-brand-bg)] text-[var(--color-brand-primary)]">
                          <Tractor className="h-4 w-4" />
                        </span>
                      )}
                      <div className="leading-tight">
                        <p className="font-medium">{f.name}</p>
                        <p className="text-[11px] text-[var(--color-brand-muted)]">
                          {String(f.id).slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {f.countryCode}
                    {f.state ? ` · ${f.state}` : ''}
                  </TD>
                  <TD className="capitalize">{f.primaryProduction ?? '—'}</TD>
                  <TD>{fmtInt(f.stats?.activeFlocksCount ?? 0)}</TD>
                  <TD className="font-medium">{fmtInt(f.stats?.currentBirds ?? 0)}</TD>
                  <TD>{fmtInt(f.stats?.staffCount ?? 0)}</TD>
                  <TD className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/farms/${f.id}`}>
                        View <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {data?.meta && (
            <Pagination
              page={data.meta.currentPage}
              lastPage={data.meta.lastPage}
              total={data.meta.total}
              perPage={data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
