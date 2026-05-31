'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Receipt, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { endpoints } from '@/lib/api';
import { fmtDate, fmtInt } from '@/lib/format';

export default function AccountsPage() {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', { q, country, page }],
    queryFn: () =>
      endpoints.listAccounts({
        q: q || undefined,
        country: country || undefined,
        page,
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Billing units — each owns one or many farms."
        actions={
          <ExportButton
            resource="accounts"
            filters={{ q: q || undefined, country: country || undefined }}
          />
        }
      />

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
              placeholder="Search by account name or referral code…"
              className="pl-9"
            />
          </div>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="Country"
            className="sm:w-32"
          />
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
      ) : data?.accounts.length === 0 ? (
        <EmptyState icon={Receipt} title="No accounts match these filters" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Account</TH>
                <TH>Country</TH>
                <TH>Currency</TH>
                <TH>Farms</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {data?.accounts.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <div className="leading-tight">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-[11px] text-[var(--color-brand-muted)]">{String(a.id).slice(0, 8)}…</p>
                    </div>
                  </TD>
                  <TD>
                    {a.countryCode}
                    {a.state ? ` · ${a.state}` : ''}
                  </TD>
                  <TD>{a.currency}</TD>
                  <TD>{fmtInt(a.farmsCount ?? 0)}</TD>
                  <TD>
                    {a.isActive && !a.archivedAt ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="muted">Inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDate(a.createdAt)}</TD>
                  <TD className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/accounts/${a.id}`}>
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
