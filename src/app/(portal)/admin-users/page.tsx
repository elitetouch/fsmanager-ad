'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { endpoints } from '@/lib/api';
import { fmtDateTime, initials } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions-catalog';

export default function AdminUsersPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { q, role, status, page }],
    queryFn: () =>
      endpoints.listAdminUsers({
        q: q || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <PageHeader
        title="Admin users"
        description="Platform staff lifecycle. Edit roles, suspend, reset passwords, or archive."
        actions={
          <Button asChild>
            <Link href="/admins">
              <ShieldCheck className="h-4 w-4" /> New admin
            </Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); setPage(1); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
          </div>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any role</option>
            {(['super_admin', 'admin', 'support', 'analyst', 'read_only'] as const).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived</option>
          </select>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {isLoading && !data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : data?.admins.length === 0 ? (
        <EmptyState icon={UsersRound} title="No admin users match these filters" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Last login</TH>
                <TH>Created</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {data?.admins.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-brand-primary)] text-xs font-semibold text-white">
                        {initials(a.name)}
                      </span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </TD>
                  <TD className="text-[var(--color-brand-muted)]">{a.email}</TD>
                  <TD>
                    <Badge tone={a.role === 'super_admin' ? 'primary' : a.role === 'admin' ? 'info' : 'muted'} className="capitalize">
                      {a.role.replace('_', ' ')}
                    </Badge>
                  </TD>
                  <TD>
                    {a.status === 'active' ? <Badge tone="success">Active</Badge>
                      : a.status === 'suspended' ? <Badge tone="warning">Suspended</Badge>
                      : <Badge tone="muted">Archived</Badge>}
                  </TD>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(a.lastLoginAt)}</TD>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(a.createdAt)}</TD>
                  <TD className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin-users/${a.id}`}>Manage <ArrowRight className="h-4 w-4" /></Link>
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
