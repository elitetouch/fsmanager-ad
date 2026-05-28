'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Inbox, Search } from 'lucide-react';
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
import { fmtInt, fmtRelative } from '@/lib/format';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'info' | 'muted' | 'accent'> = {
  open: 'info',
  pending_admin: 'accent',
  pending_user: 'warning',
  resolved: 'success',
  closed: 'muted',
};

const PRIORITY_TONE: Record<string, 'danger' | 'warning' | 'info' | 'muted'> = {
  urgent: 'danger',
  high: 'warning',
  normal: 'info',
  low: 'muted',
};

export default function SupportInboxPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [mine, setMine] = useState(false);
  const [unassigned, setUnassigned] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['support-threads', { q, status, priority, mine, unassigned, page }],
    queryFn: () =>
      endpoints.listThreads({
        q: q || undefined,
        status: status || undefined,
        priority: priority || undefined,
        mine: mine ? 1 : undefined,
        unassigned: unassigned ? 1 : undefined,
        page,
        per_page: perPage,
      }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  return (
    <div>
      <PageHeader
        title="Support inbox"
        description="In-house messaging between platform staff and tenants."
      />

      <Card className="mb-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
          }}
        >
          <div className="relative flex-1 sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by subject…" className="pl-9" />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="pending_admin">Pending admin</option>
            <option value="pending_user">Pending user</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            Assigned to me
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={unassigned} onChange={(e) => setUnassigned(e.target.checked)} />
            Unassigned
          </label>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {isLoading && !data ? (
        <Card>{[...Array(8)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : data?.threads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Inbox empty"
          description="No threads match these filters. Adjust the filters or open a new thread on a user's behalf."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Subject</TH>
                <TH>Status</TH>
                <TH>Priority</TH>
                <TH>About</TH>
                <TH>Last message</TH>
                <TH>Messages</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {data?.threads.map((t) => (
                <TR key={t.id}>
                  <TD>
                    <Link href={`/support/${t.id}`} className="font-medium hover:underline">
                      {t.subject}
                    </Link>
                    <p className="text-[11px] text-[var(--color-brand-muted)]">
                      Opened by {t.openedBy.type === 'admin' ? 'an admin' : 'a tenant'}
                    </p>
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[t.status] ?? 'muted'} className="capitalize">
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={PRIORITY_TONE[t.priority] ?? 'muted'} className="capitalize">
                      {t.priority}
                    </Badge>
                  </TD>
                  <TD className="capitalize text-[var(--color-brand-muted)]">{t.subjectType}</TD>
                  <TD className="text-[var(--color-brand-muted)]">{fmtRelative(t.lastMessageAt)}</TD>
                  <TD>{fmtInt(t.messagesCount ?? 0)}</TD>
                  <TD className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/support/${t.id}`}>
                        Open <ArrowRight className="h-4 w-4" />
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
