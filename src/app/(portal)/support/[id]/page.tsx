'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Lock, MessageSquare, Send, UserCog } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtRelative, initials } from '@/lib/format';
import type { SupportThread } from '@/types/api';
import { readAdmin } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const me = readAdmin();
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: ['thread', id],
    queryFn: () => endpoints.showThread(id),
    refetchInterval: 15_000,
  });

  // Auto-mark-read when opening
  useEffect(() => {
    endpoints.markThreadRead(id).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [thread.data?.messages.length]);

  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const send = useMutation({
    mutationFn: () => endpoints.postThreadMessage(id, body.trim(), isInternal),
    onSuccess: () => {
      setBody('');
      setIsInternal(false);
      qc.invalidateQueries({ queryKey: ['thread', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const assignMe = useMutation({
    mutationFn: () => endpoints.assignThread(id, me?.id),
    onSuccess: () => {
      toast.success('Thread assigned to you.');
      qc.invalidateQueries({ queryKey: ['thread', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const setStatus = useMutation({
    mutationFn: (s: SupportThread['status']) => endpoints.setThreadStatus(id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thread', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (thread.isLoading) return <Skeleton className="h-96" />;
  if (!thread.data) {
    return (
      <Card>
        <p>Thread not found.</p>
        <Button variant="link" asChild>
          <Link href="/support">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </Card>
    );
  }
  const { thread: t, messages } = thread.data;

  return (
    <div>
      <Button variant="link" asChild className="mb-2">
        <Link href="/support">
          <ArrowLeft className="h-4 w-4" /> Back to inbox
        </Link>
      </Button>

      <PageHeader
        title={t.subject}
        description={`Opened ${fmtRelative(t.createdAt)} · about ${t.subjectType}`}
        actions={
          <>
            <Badge
              tone={
                t.priority === 'urgent'
                  ? 'danger'
                  : t.priority === 'high'
                    ? 'warning'
                    : 'info'
              }
              className="capitalize"
            >
              {t.priority}
            </Badge>
            <Badge tone="muted" className="capitalize">
              {t.status.replace('_', ' ')}
            </Badge>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Conversation */}
        <Card className="flex h-[640px] flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--color-brand-muted)]">No messages yet.</p>
            ) : (
              <ul className="space-y-4">
                {messages.map((m) => {
                  const isAdmin = m.author.type === 'admin';
                  return (
                    <li
                      key={m.id}
                      className={cn('flex gap-3', isAdmin ? 'flex-row-reverse text-right' : '')}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white',
                          isAdmin ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--color-brand-info)]',
                        )}
                      >
                        {initials(isAdmin ? 'Admin' : 'User')}
                      </span>
                      <div className={cn('max-w-[80%]', isAdmin && 'items-end')}>
                        <p className="mb-1 text-[11px] text-[var(--color-brand-muted)]">
                          {isAdmin ? 'Admin' : 'Tenant'} · {fmtDateTime(m.createdAt)}
                          {m.isInternal && (
                            <Badge tone="warning" className="ml-2 gap-1">
                              <Lock className="h-3 w-3" /> Internal note
                            </Badge>
                          )}
                        </p>
                        <div
                          className={cn(
                            'inline-block rounded-2xl border px-4 py-2 text-sm leading-relaxed',
                            m.isInternal
                              ? 'border-[color:rgb(217_119_6/0.3)] bg-[color:rgb(217_119_6/0.06)]'
                              : isAdmin
                                ? 'border-[var(--color-brand-primary-dark)] bg-[var(--color-brand-primary)] text-white'
                                : 'border-[var(--color-brand-border)] bg-white',
                          )}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply composer */}
          <div className="border-t border-[var(--color-brand-border)] p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (body.trim().length === 0) return;
                send.mutate();
              }}
            >
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={isInternal ? 'Internal note (admins only)…' : 'Reply to the tenant…'}
                className={isInternal ? 'border-[var(--color-brand-warning)]' : ''}
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  Internal note <Lock className="h-3 w-3 text-[var(--color-brand-muted)]" />
                </label>
                <Button type="submit" disabled={send.isPending || !body.trim()}>
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Right rail: meta + actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Manage assignment and status.</CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => assignMe.mutate()}
                disabled={assignMe.isPending}
              >
                <UserCog className="h-4 w-4" /> Assign to me
              </Button>

              {t.status !== 'resolved' && t.status !== 'closed' && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setStatus.mutate('resolved')}
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark resolved
                </Button>
              )}
              {t.status !== 'closed' && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStatus.mutate('closed')}
                >
                  Close thread
                </Button>
              )}
              {t.status === 'closed' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setStatus.mutate('open')}
                >
                  Reopen
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Meta</CardTitle>
                <CardDescription>Routing context.</CardDescription>
              </div>
              <MessageSquare className="h-5 w-5 text-[var(--color-brand-muted)]" />
            </CardHeader>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between border-t border-[var(--color-brand-border)] pt-2">
                <dt className="text-[var(--color-brand-muted)]">Assignee</dt>
                <dd>{t.assignedAdminUserId ? <code className="text-xs">{String(t.assignedAdminUserId).slice(0, 8)}…</code> : 'Unassigned'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-brand-muted)]">Farm</dt>
                <dd>{t.farmId ? <Link className="underline" href={`/farms/${t.farmId}`}>open</Link> : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-brand-muted)]">Subject id</dt>
                <dd className="font-mono text-xs">{t.subjectId ? String(t.subjectId).slice(0, 8) + '…' : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-brand-muted)]">Created</dt>
                <dd>{fmtDateTime(t.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-brand-muted)]">Last reply</dt>
                <dd>{fmtRelative(t.lastMessageAt)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
