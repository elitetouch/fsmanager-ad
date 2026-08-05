'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2, Upload, Trash2, Users, MailCheck, MailX, MailWarning, Search, FileDown,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';
import type { EmailProspect, ProspectStatus } from '@/types/api';

const STATUS_TONE: Record<ProspectStatus, string> = {
  new:          'bg-slate-100 text-slate-700',
  contacted:    'bg-emerald-100 text-emerald-800',
  bounced:      'bg-rose-100 text-rose-800',
  registered:   'bg-blue-100 text-blue-800',
  unsubscribed: 'bg-amber-100 text-amber-800',
  invalid:      'bg-neutral-100 text-neutral-600',
};

const STATUS_LABEL: Record<ProspectStatus, string> = {
  new: 'New', contacted: 'Contacted', bounced: 'Bounced',
  registered: 'Registered', unsubscribed: 'Unsubscribed', invalid: 'Invalid',
};

export default function ProspectsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProspectStatus | ''>('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const perPage = 50;

  const list = useQuery({
    queryKey: ['prospects', { page, search, status }],
    queryFn: () => endpoints.listProspects({
      page, per_page: perPage,
      ...(search.trim() ? { q: search.trim() } : {}),
      ...(status ? { status } : {}),
    }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.deleteProspect(id),
    onSuccess: () => {
      toast.success('Prospect removed.');
      qc.invalidateQueries({ queryKey: ['prospects'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const rows: EmailProspect[] = list.data?.prospects ?? [];
  const total = list.data?.meta.total ?? 0;

  const statusCounts = useMemo(() => {
    const c: Record<ProspectStatus, number> = { new: 0, contacted: 0, bounced: 0, registered: 0, unsubscribed: 0, invalid: 0 };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prospects"
        description="Un-registered leads captured from CSV uploads. Each row is a marketing send target."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Upload CSV
          </Button>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Users} label="Total on page" value={fmtInt(rows.length)} tone="bg-slate-50 text-slate-800" />
        <StatTile icon={MailCheck} label="Contacted" value={fmtInt(statusCounts.contacted)} tone="bg-emerald-50 text-emerald-800" />
        <StatTile icon={MailX} label="Bounced" value={fmtInt(statusCounts.bounced)} tone="bg-rose-50 text-rose-800" />
        <StatTile icon={MailWarning} label="Unsubscribed" value={fmtInt(statusCounts.unsubscribed)} tone="bg-amber-50 text-amber-800" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--color-brand-border)] p-4">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="search">Search email / name / farm</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
              <Input
                id="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="e.g. ada@ or Green Acres"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => { setStatus(e.target.value as ProspectStatus | ''); setPage(1); }}
              className="h-10 rounded-md border border-[var(--color-brand-input-border)] bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {(Object.keys(STATUS_LABEL) as ProspectStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {list.isLoading ? (
          <div className="p-4"><Skeleton className="h-40 w-full" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No prospects yet"
            description="Upload a CSV of leads (email, name, phone, farm_name, country) to get started."
            action={<Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload CSV</Button>}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Email</TH>
                  <TH>Name</TH>
                  <TH>Farm</TH>
                  <TH>Country</TH>
                  <TH>Source</TH>
                  <TH>Status</TH>
                  <TH>Added</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.email}</TD>
                    <TD className="text-[var(--color-brand-muted)]">{p.name ?? '—'}</TD>
                    <TD className="text-[var(--color-brand-muted)]">{p.farmName ?? '—'}</TD>
                    <TD>{p.country ?? '—'}</TD>
                    <TD className="max-w-[180px] truncate text-xs text-[var(--color-brand-muted)]" title={p.source ?? ''}>
                      {p.source ?? '—'}
                    </TD>
                    <TD>
                      <Badge className={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </TD>
                    <TD className="text-xs text-[var(--color-brand-muted)]">
                      {p.createdAt ? fmtDateTime(p.createdAt) : '—'}
                    </TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remove ${p.email}? This is reversible via the DB but not the UI.`)) {
                            remove.mutate(p.id);
                          }
                        }}
                        disabled={remove.isPending}
                        className="text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-[var(--color-brand-border)] p-3">
              <Pagination
                page={page}
                perPage={perPage}
                total={total}
                lastPage={list.data?.meta.lastPage ?? 1}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brand-muted)]">{label}</p>
        <p className="text-lg font-bold text-[var(--color-brand-fg)]">{value}</p>
      </div>
    </Card>
  );
}

function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState('');
  const [result, setResult] = useState<{
    inserted: number;
    skipped_duplicates_in_file: number;
    invalid_emails: number;
    total_rows_processed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (payload: { file: File; source?: string }) =>
      endpoints.uploadProspects(payload.file, payload.source),
    onSuccess: (r) => {
      setResult(r.summary);
      toast.success(`${r.summary.inserted} prospects added.`);
      qc.invalidateQueries({ queryKey: ['prospects'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function reset() {
    setFile(null);
    setSource('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload prospect CSV</DialogTitle>
          <DialogDescription>
            Required column: <code>email</code>. Optional: <code>name</code>, <code>phone</code>,{' '}
            <code>farm_name</code>, <code>country</code>. First row is treated as headers.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 rounded-lg bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-900">Upload complete.</p>
            <ul className="space-y-1 text-emerald-900">
              <li>✓ <strong>{fmtInt(result.inserted)}</strong> prospects added</li>
              {result.skipped_duplicates_in_file > 0 && (
                <li>· {fmtInt(result.skipped_duplicates_in_file)} duplicates within the file were skipped</li>
              )}
              {result.invalid_emails > 0 && (
                <li>· {fmtInt(result.invalid_emails)} rows had invalid or missing email addresses</li>
              )}
              <li className="text-xs opacity-70">from {fmtInt(result.total_rows_processed)} total rows processed</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">CSV file</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="mt-1 text-xs text-[var(--color-brand-muted)]">
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="source">Source label (optional)</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. agrictech-lagos-2026 · shortlist-cohort-3"
                maxLength={60}
              />
              <p className="mt-1 text-xs text-[var(--color-brand-muted)]">
                Helps group prospects on the campaign audience picker later. Defaults to today's date.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--color-brand-bg)] p-3 text-xs text-[var(--color-brand-muted)]">
              <p className="mb-1 font-semibold text-[var(--color-brand-fg)]">Example CSV</p>
              <pre className="overflow-x-auto text-[11px]">
{`email,name,phone,farm_name,country
ada@example.com,Ada Farmer,+2347012345678,Green Acres,NG
ben@example.com,Ben Owner,,Sunny Farms,NG`}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => file && upload.mutate({ file, source: source.trim() || undefined })}
                disabled={!file || upload.isPending}
              >
                {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Upload &amp; import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
