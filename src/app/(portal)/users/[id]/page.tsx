'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ExternalLink,
  Mail,
  MailCheck,
  Phone,
  Pin,
  StickyNote,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
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
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDate, fmtDateTime, fmtInt, initials } from '@/lib/format';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['user', id],
    queryFn: () => endpoints.showUser(id),
  });
  const notes = useQuery({
    queryKey: ['user-notes', id],
    queryFn: () => endpoints.userNotes(id),
  });

  const suspend = useMutation({
    mutationFn: (reason: string) => endpoints.suspendUser(id, reason),
    onSuccess: () => {
      toast.success('User suspended.');
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const unsuspend = useMutation({
    mutationFn: () => endpoints.unsuspendUser(id),
    onSuccess: () => {
      toast.success('User reinstated.');
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const verifyEmail = useMutation({
    mutationFn: () => endpoints.verifyUserEmail(id),
    onSuccess: () => {
      toast.success('Email marked verified.');
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const [noteBody, setNoteBody] = useState('');
  const [notePinned, setNotePinned] = useState(false);
  const addNote = useMutation({
    mutationFn: () => endpoints.addUserNote(id, noteBody.trim(), notePinned),
    onSuccess: () => {
      toast.success('Note saved.');
      setNoteBody('');
      setNotePinned(false);
      qc.invalidateQueries({ queryKey: ['user-notes', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (detail.isLoading) {
    return <Skeleton className="h-64" />;
  }
  if (!detail.data) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-brand-muted)]">User not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" /> Back to users
          </Link>
        </Button>
      </Card>
    );
  }

  const { user, memberships, recentActivity, flags } = detail.data;

  return (
    <div>
      <Button variant="link" asChild className="mb-2">
        <Link href="/users">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
      </Button>

      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          <>
            {flags?.isSuspended ? (
              <Button variant="primary" onClick={() => unsuspend.mutate()} disabled={unsuspend.isPending}>
                <CheckCircle2 className="h-4 w-4" /> Reinstate
              </Button>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="danger">
                    <Ban className="h-4 w-4" /> Suspend
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Suspend this user?</DialogTitle>
                    <DialogDescription>
                      Revokes every Sanctum token (signs them out everywhere) and flags
                      the account internally. The user record is NOT deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const reason = (
                        new FormData(e.currentTarget).get('reason') as string
                      )?.trim();
                      suspend.mutate(reason || '');
                    }}
                  >
                    <Textarea name="reason" placeholder="Reason (visible in audit log)…" required />
                    <DialogFooter>
                      <Button variant="danger" type="submit" disabled={suspend.isPending}>
                        Suspend account
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {!user.emailVerifiedAt && (
              <Button
                variant="secondary"
                onClick={() => verifyEmail.mutate()}
                disabled={verifyEmail.isPending}
              >
                <MailCheck className="h-4 w-4" /> Mark email verified
              </Button>
            )}
          </>
        }
      />

      {/* Identity card */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="flex flex-col items-center text-center">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={user.name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-24 w-24 place-items-center rounded-full bg-[var(--color-brand-primary)] text-2xl font-semibold text-white">
              {initials(user.name)}
            </span>
          )}
          <h2 className="mt-3 text-lg font-semibold">{user.name}</h2>
          <p className="text-sm text-[var(--color-brand-muted)]">{user.email}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {flags?.isSuspended ? (
              <Badge tone="danger">Suspended</Badge>
            ) : (
              <Badge tone="success">Active</Badge>
            )}
            {user.emailVerifiedAt && <Badge tone="info">Email verified</Badge>}
            {user.phoneVerifiedAt && <Badge tone="info">Phone verified</Badge>}
          </div>

          <dl className="mt-6 w-full space-y-2 text-left text-sm">
            <div className="flex items-center justify-between border-t border-[var(--color-brand-border)] pt-2">
              <dt className="text-[var(--color-brand-muted)]">User ID</dt>
              <dd className="font-mono text-xs">{String(user.id)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--color-brand-muted)]">Phone</dt>
              <dd>{user.phone || '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--color-brand-muted)]">Joined</dt>
              <dd>{fmtDate(user.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        {/* Tabs: memberships, activity, notes */}
        <Card className="overflow-hidden">
          <Tabs defaultValue="memberships">
            <TabsList>
              <TabsTrigger value="memberships">Farms ({memberships.length})</TabsTrigger>
              <TabsTrigger value="activity">Recent activity ({recentActivity.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes.data?.notes.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="memberships">
              {memberships.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-brand-muted)]">No farm memberships.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Farm</TH>
                      <TH>Country</TH>
                      <TH>Role</TH>
                      <TH>Status</TH>
                      <TH>Joined</TH>
                      <TH>Last active</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {memberships.map((m) => (
                      <TR key={m.farmId}>
                        <TD className="font-medium">{m.farmName}</TD>
                        <TD>
                          {m.countryCode}
                          {m.state ? ` · ${m.state}` : ''}
                        </TD>
                        <TD>
                          <Badge tone="muted" className="capitalize">
                            {m.role}
                          </Badge>
                        </TD>
                        <TD>
                          <Badge
                            tone={m.status === 'active' ? 'success' : 'warning'}
                            className="capitalize"
                          >
                            {m.status}
                          </Badge>
                        </TD>
                        <TD className="text-[var(--color-brand-muted)]">{fmtDate(m.joinedAt)}</TD>
                        <TD className="text-[var(--color-brand-muted)]">
                          {fmtDate(m.lastActiveAt)}
                        </TD>
                        <TD>
                          <Button asChild variant="link" size="sm">
                            <Link href={`/farms/${m.farmId}`}>
                              Farm <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="activity">
              {recentActivity.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-brand-muted)]">
                  No daily records authored.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Event</TH>
                      <TH>Day</TH>
                      <TH>Birds Δ</TH>
                      <TH>Snapshot</TH>
                      <TH>Qty</TH>
                      <TH>Note</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {recentActivity.map((r) => (
                      <TR key={String(r.id)}>
                        <TD>
                          <Badge tone="muted" className="capitalize">
                            {String(r.event_type)}
                          </Badge>
                        </TD>
                        <TD className="text-[var(--color-brand-muted)]">{fmtDate(String(r.record_date))}</TD>
                        <TD>{r.birds_delta != null ? fmtInt(Number(r.birds_delta)) : '—'}</TD>
                        <TD>{r.birds_snapshot != null ? fmtInt(Number(r.birds_snapshot)) : '—'}</TD>
                        <TD>
                          {r.quantity != null
                            ? `${r.quantity} ${(r.unit as string) ?? ''}`
                            : '—'}
                        </TD>
                        <TD className="max-w-[260px] truncate text-xs text-[var(--color-brand-muted)]">
                          {(r.note as string) || ''}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="notes">
              {/* New note */}
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
                  placeholder="Add an internal note (admins only)…"
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

              {/* Existing notes */}
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

      {/* Quick contact buttons (decorative) */}
      <Card className="mt-4 flex flex-wrap items-center gap-3">
        <CardHeader className="m-0 flex-1">
          <div>
            <CardTitle className="text-sm">Quick contact</CardTitle>
            <CardDescription>Email or SMS the user directly from your client.</CardDescription>
          </div>
        </CardHeader>
        <Button variant="secondary" asChild>
          <a href={`mailto:${user.email}`}>
            <Mail className="h-4 w-4" /> Email
          </a>
        </Button>
        {user.phone && (
          <Button variant="secondary" asChild>
            <a href={`tel:${user.phone}`}>
              <Phone className="h-4 w-4" /> Call
            </a>
          </Button>
        )}
      </Card>
    </div>
  );
}
