'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, ArrowLeft, MapPin, Pin, StickyNote, Tractor } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { BarStat } from '@/components/charts/bar-stat';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDate, fmtDateTime, fmtInt } from '@/lib/format';

export default function FarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const detail = useQuery({ queryKey: ['farm', id], queryFn: () => endpoints.showFarm(id) });
  const notes = useQuery({ queryKey: ['farm-notes', id], queryFn: () => endpoints.farmNotes(id) });

  const archive = useMutation({
    mutationFn: (reason: string) => endpoints.archiveFarm(id, reason),
    onSuccess: () => {
      toast.success('Farm archived.');
      qc.invalidateQueries({ queryKey: ['farm', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const restore = useMutation({
    mutationFn: () => endpoints.restoreFarm(id),
    onSuccess: () => {
      toast.success('Farm restored.');
      qc.invalidateQueries({ queryKey: ['farm', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const [noteBody, setNoteBody] = useState('');
  const [notePinned, setNotePinned] = useState(false);
  const addNote = useMutation({
    mutationFn: () => endpoints.addFarmNote(id, noteBody.trim(), notePinned),
    onSuccess: () => {
      setNoteBody('');
      setNotePinned(false);
      toast.success('Note saved.');
      qc.invalidateQueries({ queryKey: ['farm-notes', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (detail.isLoading) return <Skeleton className="h-64" />;
  if (!detail.data) {
    return (
      <Card>
        <p className="text-sm">Farm not found.</p>
        <Button variant="link" asChild>
          <Link href="/farms">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </Card>
    );
  }
  const { farm, members, flocks, recordTotals } = detail.data;
  const isArchived = !!farm.archivedAt;

  return (
    <div>
      <Button variant="link" asChild className="mb-2">
        <Link href="/farms">
          <ArrowLeft className="h-4 w-4" /> Back to farms
        </Link>
      </Button>

      <PageHeader
        title={farm.name}
        description={
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--color-brand-muted)]" />
            {farm.countryCode}
            {farm.state ? ` · ${farm.state}` : ''}
            {farm.lga ? ` · ${farm.lga}` : ''}
          </span>
        }
        actions={
          isArchived ? (
            <Button variant="primary" onClick={() => restore.mutate()} disabled={restore.isPending}>
              <ArchiveRestore className="h-4 w-4" /> Restore
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="danger">
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive this farm?</DialogTitle>
                  <DialogDescription>
                    Archives the farm + all pens + all active flocks. Tenants can no
                    longer write to it; the record is preserved.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const r = (new FormData(e.currentTarget).get('reason') as string)?.trim();
                    archive.mutate(r || '');
                  }}
                >
                  <Textarea name="reason" placeholder="Reason (for the audit trail)…" required />
                  <DialogFooter>
                    <Button variant="danger" type="submit" disabled={archive.isPending}>
                      Archive farm
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Stats panel */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>At a glance</CardTitle>
              <CardDescription>Live counts from the live tables.</CardDescription>
            </div>
            {isArchived ? <Badge tone="danger">Archived</Badge> : <Badge tone="success">Active</Badge>}
          </CardHeader>

          <dl className="space-y-3 text-sm">
            {[
              ['Active flocks', farm.stats?.activeFlocksCount],
              ['Active pens', farm.stats?.activePensCount],
              ['Current birds', farm.stats?.currentBirds],
              ['Placed all-time', farm.stats?.placedBirdsAllTime],
              ['Staff', farm.stats?.staffCount],
              ['Estimated capacity', farm.estimatedCapacity],
            ].map(([k, v]) => (
              <div
                key={k as string}
                className="flex items-center justify-between border-t border-[var(--color-brand-border)] pt-3"
              >
                <dt className="text-[var(--color-brand-muted)]">{k as string}</dt>
                <dd className="font-medium">{fmtInt(v as number)}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 space-y-2 text-xs text-[var(--color-brand-muted)]">
            <p>Type · <span className="text-[var(--color-brand-fg)] capitalize">{farm.farmType ?? '—'}</span></p>
            <p>Production · <span className="text-[var(--color-brand-fg)] capitalize">{farm.primaryProduction ?? '—'}</span></p>
            <p>Market · <span className="text-[var(--color-brand-fg)] capitalize">{farm.targetMarket ?? '—'}</span></p>
            <p>Timezone · <span className="text-[var(--color-brand-fg)]">{farm.timezone}</span></p>
            <p>Created · <span className="text-[var(--color-brand-fg)]">{fmtDate(farm.createdAt)}</span></p>
          </div>
        </Card>

        {/* Tabs */}
        <Card className="overflow-hidden">
          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
              <TabsTrigger value="flocks">Flocks ({flocks.length})</TabsTrigger>
              <TabsTrigger value="records">Activity</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes.data?.notes.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              {members.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-brand-muted)]">No members.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>User</TH>
                      <TH>Email</TH>
                      <TH>Role</TH>
                      <TH>Status</TH>
                      <TH>Joined</TH>
                      <TH>Last active</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {members.map((m) => (
                      <TR key={String(m.id)}>
                        <TD>
                          <Link href={`/users/${m.id}`} className="font-medium hover:underline">
                            {m.name}
                          </Link>
                        </TD>
                        <TD className="text-[var(--color-brand-muted)]">{m.email}</TD>
                        <TD>
                          <Badge tone="muted" className="capitalize">
                            {m.role}
                          </Badge>
                        </TD>
                        <TD>
                          <Badge tone={m.status === 'active' ? 'success' : 'warning'} className="capitalize">
                            {m.status}
                          </Badge>
                        </TD>
                        <TD className="text-[var(--color-brand-muted)]">{fmtDate(m.joined_at)}</TD>
                        <TD className="text-[var(--color-brand-muted)]">{fmtDate(m.last_active_at)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="flocks">
              {flocks.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-brand-muted)]">No flocks.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Flock ID</TH>
                      <TH>Production</TH>
                      <TH>Placed</TH>
                      <TH>Current</TH>
                      <TH>Active</TH>
                      <TH>Started</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {flocks.map((fl) => (
                      <TR key={String(fl.id)}>
                        <TD className="font-mono text-xs">{String(fl.id).slice(0, 12)}…</TD>
                        <TD className="capitalize">{String(fl.production_type)}</TD>
                        <TD>{fmtInt(Number(fl.placed_birds))}</TD>
                        <TD>{fmtInt(Number(fl.current_birds))}</TD>
                        <TD>
                          {fl.is_active && !fl.archived_at ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <Badge tone="muted">Ended</Badge>
                          )}
                        </TD>
                        <TD className="text-[var(--color-brand-muted)]">
                          {fmtDate(String(fl.start_date))}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="records">
              {recordTotals.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-brand-muted)]">No daily records yet.</p>
              ) : (
                <BarStat
                  data={recordTotals.map((r) => ({ label: r.eventType, total: r.count }))}
                  xKey="label"
                  yKey="total"
                />
              )}
            </TabsContent>

            <TabsContent value="notes">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (noteBody.trim().length === 0) return;
                  addNote.mutate();
                }}
                className="mb-4 flex flex-col gap-2"
              >
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Internal note for this farm…"
                />
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notePinned}
                      onChange={(e) => setNotePinned(e.target.checked)}
                    />
                    Pin to top
                  </label>
                  <Button type="submit" disabled={addNote.isPending || !noteBody.trim()}>
                    <StickyNote className="h-4 w-4" /> Save note
                  </Button>
                </div>
              </form>

              {notes.data?.notes.length === 0 ? (
                <p className="text-sm text-[var(--color-brand-muted)]">No notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {notes.data?.notes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-[var(--color-brand-border)] bg-white p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {n.pinned && (
                          <Badge tone="accent" className="gap-1">
                            <Pin className="h-3 w-3" /> Pinned
                          </Badge>
                        )}
                        <span className="text-xs text-[var(--color-brand-muted)]">
                          {n.author?.name ?? 'Admin'} · {fmtDateTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
