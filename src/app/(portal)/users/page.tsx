'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Search, Users as UsersIcon, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { endpoints } from '@/lib/api';
import { fmtDate, fmtInt, initials } from '@/lib/format';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [verified, setVerified] = useState<'' | 'true' | 'false'>('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, verified, country, page }],
    queryFn: () =>
      endpoints.listUsers({
        q: search || undefined,
        verified: verified || undefined,
        country: country || undefined,
        page,
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader
        title="Tenant users"
        description="Every signed-up farmer, manager, and staff member across all farms."
        actions={
          <ExportButton
            resource="users"
            filters={{ q: search || undefined, verified: verified || undefined, country: country || undefined }}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone…"
              className="pl-9"
            />
          </div>
          <select
            value={verified}
            onChange={(e) => {
              setVerified(e.target.value as '' | 'true' | 'false');
              setPage(1);
            }}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">All verification states</option>
            <option value="true">Verified email</option>
            <option value="false">Unverified email</option>
          </select>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="Country (e.g. NG)"
            className="sm:w-40"
          />
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      {isLoading && !data ? (
        <Card className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </Card>
      ) : data?.users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users match these filters"
          description="Try clearing the filters above or broadening your search."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH>Farms</TH>
                <TH>Verified</TH>
                <TH>Joined</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data?.users.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      {u.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-brand-primary)] text-xs font-semibold text-white">
                          {initials(u.name)}
                        </span>
                      )}
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TD>
                  <TD className="text-[var(--color-brand-muted)]">{u.email}</TD>
                  <TD className="text-[var(--color-brand-muted)]">{u.phone || '—'}</TD>
                  <TD>
                    {fmtInt(u.farmsCount ?? 0)} <span className="text-[var(--color-brand-muted)]">/ {fmtInt(u.ownedFarmsCount ?? 0)} owned</span>
                  </TD>
                  <TD>
                    {u.emailVerifiedAt ? (
                      <Badge tone="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge tone="warning" className="gap-1">
                        <XCircle className="h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </TD>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDate(u.createdAt)}</TD>
                  <TD className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/users/${u.id}`}>
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
