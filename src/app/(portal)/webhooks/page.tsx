'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Webhook } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { endpoints } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

export default function WebhooksPage() {
  const [provider, setProvider] = useState('');
  const [signature, setSignature] = useState('');
  const [reference, setReference] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const perPage = 50;

  const q = useQuery({
    queryKey: ['webhooks', { provider, signature, reference, page }],
    queryFn: () => endpoints.listWebhooks({
      provider: provider || undefined,
      signature_status: signature || undefined,
      reference: reference || undefined,
      page,
      per_page: perPage,
    }),
  });

  return (
    <div>
      <PageHeader title="Webhook deliveries" description="Inbound provider webhooks — forensic record for billing disputes." />

      <Card className="mb-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm">
            <option value="">Any provider</option>
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
          </select>
          <select value={signature} onChange={(e) => setSignature(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm">
            <option value="">Any signature</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
            <option value="missing">Missing</option>
          </select>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference contains…" className="flex-1" />
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {q.isLoading && !q.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : q.data?.rows.length === 0 ? (
        <EmptyState icon={Webhook} title="No webhook deliveries" description="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Provider</TH>
                <TH>Event</TH>
                <TH>Signature</TH>
                <TH>Processing</TH>
                <TH>Reference</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {q.data?.rows.map((row) => {
                const r = row as Record<string, unknown>;
                const id = String(r.id ?? '');
                const sig = String(r.signature_status ?? '');
                const proc = String(r.processing_status ?? '');
                return (
                  <Fragment key={id}>
                    <TR>
                      <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(String(r.created_at ?? ''))}</TD>
                      <TD className="capitalize">{String(r.provider ?? '—')}</TD>
                      <TD>{r.event_type ? <Badge tone="muted">{String(r.event_type)}</Badge> : '—'}</TD>
                      <TD>
                        <Badge tone={sig === 'valid' ? 'success' : sig === 'invalid' ? 'danger' : 'warning'} className="capitalize">{sig}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={proc === 'processed' ? 'success' : proc === 'error' ? 'danger' : 'muted'} className="capitalize">{proc}</Badge>
                      </TD>
                      <TD className="font-mono text-xs">{String(r.reference ?? '—')}</TD>
                      <TD className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setOpenId(openId === id ? null : id)}>
                          <ChevronDown className={`h-4 w-4 transition ${openId === id ? 'rotate-180' : ''}`} />
                        </Button>
                      </TD>
                    </TR>
                    {openId === id && (
                      <TR>
                        <TD colSpan={7} className="bg-[var(--color-brand-bg)]">
                          <details open className="text-xs">
                            <summary className="cursor-pointer font-medium">Body</summary>
                            <pre className="mt-1 overflow-auto rounded-md bg-white p-3 text-[11px]">{JSON.stringify(r.body ?? {}, null, 2)}</pre>
                          </details>
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer font-medium">Headers</summary>
                            <pre className="mt-1 overflow-auto rounded-md bg-white p-3 text-[11px]">{JSON.stringify(r.headers ?? {}, null, 2)}</pre>
                          </details>
                          {r.processing_note ? <p className="mt-2 text-xs">Note: {String(r.processing_note)}</p> : null}
                        </TD>
                      </TR>
                    )}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
          {q.data?.meta && (
            <Pagination page={q.data.meta.currentPage} lastPage={q.data.meta.lastPage} total={q.data.meta.total} perPage={q.data.meta.perPage} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
