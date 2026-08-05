'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Activity } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { endpoints } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';
import type { EmailSendStatus } from '@/types/api';

const STATUS_TONE: Record<EmailSendStatus, string> = {
  queued:       'bg-slate-100 text-slate-700',
  sent:         'bg-blue-100 text-blue-800',
  delivered:    'bg-blue-100 text-blue-800',
  opened:       'bg-emerald-100 text-emerald-800',
  clicked:      'bg-emerald-200 text-emerald-900',
  bounced:      'bg-rose-100 text-rose-800',
  complained:   'bg-rose-100 text-rose-800',
  failed:       'bg-rose-200 text-rose-900',
  unsubscribed: 'bg-amber-100 text-amber-800',
};

export default function TrackingPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmailSendStatus | ''>('');
  const perPage = 50;

  const list = useQuery({
    queryKey: ['email-sends', { page, search, status }],
    queryFn: () => endpoints.listEmailSends({
      page,
      per_page: perPage,
      ...(search.trim() ? { q: search.trim() } : {}),
      ...(status ? { status } : {}),
    }),
  });

  const rows = list.data?.sends ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Email tracking"
        description="Every marketing email that's gone out — with delivery, open, click, bounce, and unsubscribe status."
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--color-brand-border)] p-4">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="q">Search recipient</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
              <Input id="q" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="email or name" className="pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => { setStatus(e.target.value as EmailSendStatus | ''); setPage(1); }}
              className="h-10 rounded-md border border-[var(--color-brand-input-border)] bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_TONE) as EmailSendStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {list.isLoading ? (
          <div className="p-4"><Skeleton className="h-40 w-full" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Activity} title="No sends match" description="Once you run a campaign, every recipient message shows up here." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Recipient</TH>
                  <TH>Campaign</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Opens</TH>
                  <TH className="text-right">Clicks</TH>
                  <TH>Sent</TH>
                  <TH>Last activity</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <div className="font-medium">{r.recipientEmail}</div>
                      {r.recipientName && <div className="text-xs text-[var(--color-brand-muted)]">{r.recipientName}</div>}
                    </TD>
                    <TD>
                      {r.campaignId ? (
                        <Link href={`/marketing/campaigns/${r.campaignId}`} className="text-[var(--color-brand-primary-deep)] hover:underline">
                          {r.campaignName ?? r.campaignId.slice(0, 8)}
                        </Link>
                      ) : '—'}
                    </TD>
                    <TD>
                      <Badge className={STATUS_TONE[r.status]}>{r.status}</Badge>
                      {r.errorMessage && <div className="mt-1 text-[10px] text-rose-700" title={r.errorMessage}>{r.errorMessage.slice(0, 60)}</div>}
                    </TD>
                    <TD className="text-right">{fmtInt(r.openCount)}</TD>
                    <TD className="text-right">{fmtInt(r.clickCount)}</TD>
                    <TD className="text-xs text-[var(--color-brand-muted)]">{r.sentAt ? fmtDateTime(r.sentAt) : '—'}</TD>
                    <TD className="text-xs text-[var(--color-brand-muted)]">
                      {r.firstClickedAt ? `Clicked ${fmtDateTime(r.firstClickedAt)}` :
                       r.firstOpenedAt ? `Opened ${fmtDateTime(r.firstOpenedAt)}` :
                       r.bouncedAt ? `Bounced ${fmtDateTime(r.bouncedAt)}` :
                       r.unsubscribedAt ? `Unsub'd ${fmtDateTime(r.unsubscribedAt)}` : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-[var(--color-brand-border)] p-3">
              <Pagination page={page} perPage={perPage} total={list.data?.meta.total ?? 0} lastPage={list.data?.meta.lastPage ?? 1} onChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
