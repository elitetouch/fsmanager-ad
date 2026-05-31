'use client';

import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';

export default function FailedJobsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const perPage = 50;

  const q = useQuery({
    queryKey: ['failed-jobs', { page }],
    queryFn: () => endpoints.listFailedJobs({ page, per_page: perPage }),
  });

  const retry = useMutation({
    mutationFn: (uuid: string) => endpoints.retryFailedJob(uuid),
    onSuccess: () => { toast.success('Re-queued.'); qc.invalidateQueries({ queryKey: ['failed-jobs'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const del = useMutation({
    mutationFn: (uuid: string) => endpoints.deleteFailedJob(uuid),
    onSuccess: () => { toast.success('Deleted.'); qc.invalidateQueries({ queryKey: ['failed-jobs'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const flush = useMutation({
    mutationFn: () => endpoints.flushFailedJobs(),
    onSuccess: (r) => { toast.success(`Flushed ${r.deleted} jobs.`); qc.invalidateQueries({ queryKey: ['failed-jobs'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Failed jobs"
        description="Queue-worker failures awaiting retry or deletion."
        actions={
          q.data?.summary && q.data.summary.total > 0 ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="danger"><Trash2 className="h-4 w-4" /> Flush all ({fmtInt(q.data.summary.total)})</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Flush every failed job?</DialogTitle>
                  <DialogDescription>
                    Permanently deletes every row in failed_jobs. There&apos;s no undo. Use only after
                    you&apos;re sure none of them are worth retrying.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="danger" onClick={() => flush.mutate()} disabled={flush.isPending}>Yes, flush</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {q.data?.summary && (
        <Card className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">Total failed jobs</p>
            <p className="text-2xl font-semibold">{fmtInt(q.data.summary.total)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">Last 24h</p>
            <p className="text-2xl font-semibold">{fmtInt(q.data.summary.last24h)}</p>
          </div>
        </Card>
      )}

      {q.isLoading && !q.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : q.data?.rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No failed jobs" description="Queue workers are healthy. Or there are no queue workers." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Failed at</TH>
                <TH>Queue</TH>
                <TH>Connection</TH>
                <TH>Exception</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {q.data?.rows.map((row) => {
                const r = row as Record<string, unknown>;
                const uuid = String(r.uuid ?? '');
                return (
                  <Fragment key={uuid}>
                    <TR>
                      <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(String(r.failed_at ?? ''))}</TD>
                      <TD><Badge tone="muted">{String(r.queue ?? '—')}</Badge></TD>
                      <TD className="text-[var(--color-brand-muted)]">{String(r.connection ?? '—')}</TD>
                      <TD className="max-w-[400px] truncate text-xs">{String(r.exception ?? '').split('\n')[0]}</TD>
                      <TD className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setOpenId(openId === uuid ? null : uuid)}>
                            <ChevronDown className={`h-4 w-4 transition ${openId === uuid ? 'rotate-180' : ''}`} />
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => retry.mutate(uuid)}>
                            <RefreshCw className="h-3 w-3" /> Retry
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => del.mutate(uuid)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                    {openId === uuid && (
                      <TR>
                        <TD colSpan={5} className="bg-[var(--color-brand-bg)]">
                          <pre className="overflow-auto rounded-md bg-white p-3 text-[11px]">{String(r.exception ?? '')}</pre>
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer">Payload</summary>
                            <pre className="mt-1 overflow-auto rounded-md bg-white p-3 text-[11px]">{String(r.payload ?? '')}</pre>
                          </details>
                        </TD>
                      </TR>
                    )}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
          {q.data?.meta && (
            <Pagination
              page={q.data.meta.currentPage}
              lastPage={q.data.meta.lastPage}
              total={q.data.meta.total}
              perPage={q.data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
