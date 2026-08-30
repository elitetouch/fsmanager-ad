'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Megaphone, PlusCircle, Send, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';

type Campaign = Record<string, unknown>;

export default function BroadcastsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<Campaign | null>(null);
  const perPage = 25;

  const list = useQuery({
    queryKey: ['broadcasts', { page }],
    queryFn: () => endpoints.listBroadcasts({ page, per_page: perPage }),
  });

  const preview = useMutation({
    mutationFn: (id: string) => endpoints.previewBroadcast(id),
    onSuccess: (r) => {
      // For push, the recipient count on its own is misleading — most of
      // a user base has never granted notification permission, so a
      // campaign resolving thousands may reach a few hundred phones.
      // Surfacing the gap here is the whole point of previewing.
      if (r.pushReachableCount === null) {
        toast.success(`Resolved ${fmtInt(r.recipientsCount)} recipients.`);
      } else if (r.pushReachableCount === 0) {
        toast.error(
          `Resolved ${fmtInt(r.recipientsCount)} recipients, but none have notifications turned on. Nothing would be delivered.`,
        );
      } else {
        toast.success(
          `${fmtInt(r.pushReachableCount)} of ${fmtInt(r.recipientsCount)} recipients can receive a push.`,
        );
      }
      qc.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const dispatch = useMutation({
    mutationFn: (id: string) => endpoints.dispatchBroadcast(id),
    onSuccess: () => { toast.success('Campaign queued for delivery.'); setConfirming(null); qc.invalidateQueries({ queryKey: ['broadcasts'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Broadcasts"
        description="Send targeted email, SMS or push campaigns to filtered user segments. Always preview the count before dispatch — push only reaches users who turned notifications on."
        actions={<Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> New campaign</Button>}
      />

      {list.isLoading && !list.data ? (
        <Card>{[...Array(5)].map((_, i) => <Skeleton key={i} className="mb-2 h-12" />)}</Card>
      ) : list.data?.campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Plan ahead and use Preview to confirm reach before sending." />
      ) : (
        <>
          <Table>
            <THead><TR><TH>Name</TH><TH>Channel</TH><TH>Status</TH><TH>Recipients</TH><TH>Sent / Failed</TH><TH>Created</TH><TH></TH></TR></THead>
            <TBody>
              {list.data?.campaigns.map((row) => {
                const c = row as Campaign;
                const status = String(c.status);
                return (
                  <TR key={String(c.id)}>
                    <TD className="font-medium">{String(c.name)}</TD>
                    <TD className="uppercase text-xs tracking-wide">{String(c.channel)}</TD>
                    <TD><StatusBadge status={status} /></TD>
                    <TD>{fmtInt(Number(c.recipients_count ?? 0))}</TD>
                    <TD>{fmtInt(Number(c.sent_count ?? 0))} / {fmtInt(Number(c.failed_count ?? 0))}</TD>
                    <TD className="text-[var(--color-brand-muted)] text-sm">{fmtDateTime(String(c.created_at))}</TD>
                    <TD className="text-right whitespace-nowrap">
                      {status === 'draft' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => preview.mutate(String(c.id))} disabled={preview.isPending}>
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setConfirming(c)}>
                            <Send className="h-3.5 w-3.5" /> Dispatch
                          </Button>
                        </>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          {list.data?.meta && (
            <Pagination
              page={list.data.meta.currentPage}
              lastPage={list.data.meta.lastPage}
              total={list.data.meta.total}
              perPage={list.data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New broadcast campaign</DialogTitle>
            <DialogDescription>Save as draft, then click Preview on the row to resolve recipients before dispatch.</DialogDescription>
          </DialogHeader>
          <CampaignForm onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['broadcasts'] }); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirming} onOpenChange={(o) => { if (!o) setConfirming(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch campaign</DialogTitle>
            <DialogDescription>
              This will queue delivery to {fmtInt(Number(confirming?.recipients_count ?? 0))} recipients. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button onClick={() => confirming?.id && dispatch.mutate(String(confirming.id))} disabled={dispatch.isPending}>
              {dispatch.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'sent' ? 'success' : status === 'sending' ? 'info' : status === 'failed' ? 'danger' : 'muted';
  return <Badge tone={tone as 'success' | 'info' | 'danger' | 'muted'}>{status}</Badge>;
}

function CampaignForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | 'inapp' | 'push'>('email');
  const [linkUrl, setLinkUrl] = useState('/');
  const [pushReachableOnly, setPushReachableOnly] = useState(true);

  const isPush = channel === 'push';

  // The OS clips a notification at these lengths, on a screen we never
  // see. Kept in sync with PushMessage::MAX_TITLE / MAX_BODY, which
  // enforces the same limits server-side — this is the courtesy copy so
  // an admin sees the ceiling while writing rather than after sending.
  const MAX_TITLE = 65;
  const MAX_BODY = 180;
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [country, setCountry] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasFarm, setHasFarm] = useState(false);
  const [inactiveDays, setInactiveDays] = useState<number | ''>('');

  const segment = () => ({
    country: country || undefined,
    verified: verifiedOnly || undefined,
    hasFarm: hasFarm || undefined,
    inactive_days: inactiveDays === '' ? undefined : Number(inactiveDays),
    // Push only. Without it a "push to everyone" campaign materialises
    // every account on the platform and marks most of them failed — a
    // farmer who never granted notification permission has no device to
    // send to, which is the normal case, not an error.
    hasPushDevice: isPush && pushReachableOnly ? true : undefined,
  });

  const create = useMutation({
    mutationFn: () => endpoints.createBroadcast({
      name,
      channel,
      subject: subject || undefined,
      body,
      link_url: isPush ? (linkUrl || '/') : undefined,
      segment: segment(),
    }),
    onSuccess: () => { toast.success('Campaign saved as draft.'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div>
          <Label>Channel *</Label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as 'email' | 'sms' | 'inapp' | 'push')}
            className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="inapp">In-app</option>
            <option value="push">Push notification</option>
          </select>
        </div>
      </div>
      {channel === 'email' && (
        <div><Label>Subject *</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
      )}

      {isPush && (
        <>
          <div>
            <Label>Notification title *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={MAX_TITLE}
              required
              placeholder="Scheduled maintenance tonight"
            />
            <Counter value={subject.length} max={MAX_TITLE} />
          </div>
          <div>
            <Label>Opens at</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/"
            />
            <p className="mt-1 text-xs text-[var(--color-brand-muted)]">
              A path inside the app, starting with <code>/</code>. External links are rejected.
            </p>
          </div>
        </>
      )}

      <div>
        <Label>{isPush ? 'Message *' : 'Body *'}</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={isPush ? 'min-h-[90px]' : 'min-h-[140px]'}
          maxLength={isPush ? MAX_BODY : undefined}
          required
        />
        {isPush && <Counter value={body.length} max={MAX_BODY} />}
      </div>

      {isPush && (
        <LockScreenPreview title={subject} body={body} />
      )}

      <fieldset className="rounded-[var(--radius-card)] border border-[var(--color-brand-border)] p-3">
        <legend className="px-2 text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">Segment</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Country (ISO-2)</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="NG" maxLength={2} />
          </div>
          <div>
            <Label>Inactive for N days</Label>
            <Input
              type="number"
              min={1}
              value={inactiveDays}
              onChange={(e) => setInactiveDays(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified only
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hasFarm} onChange={(e) => setHasFarm(e.target.checked)} /> Has at least one farm
          </label>
          {isPush && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pushReachableOnly}
                onChange={(e) => setPushReachableOnly(e.target.checked)}
              />{' '}
              Only users with notifications on
            </label>
          )}
        </div>
        <p className="mt-3 text-xs text-[var(--color-brand-muted)]">
          Recipient count is resolved when you click <strong>Preview</strong> on the campaign row after saving.
        </p>
      </fieldset>

      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save draft</Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Live character counter.
 *
 * Goes amber near the ceiling rather than only at it, because the ceiling
 * is not where phones actually cut — it is where WE cut. Narrow devices
 * clip earlier, so "you have 3 characters left" should already feel like
 * a warning.
 */
function Counter({ value, max }: { value: number; max: number }) {
  const near = value > max * 0.85;
  return (
    <p
      className={[
        'mt-1 text-right text-xs tabular-nums',
        near ? 'text-[var(--color-brand-warning,#b45309)]' : 'text-[var(--color-brand-muted)]',
      ].join(' ')}
    >
      {value}/{max}
    </p>
  );
}

/**
 * Approximate lock-screen rendering.
 *
 * Not decoration. A push is the one message type an author never sees
 * before it lands on thousands of phones — there is no "send test to
 * myself" for a broadcast, and no way to recall one. Showing the shape
 * of the thing catches the two mistakes that matter: a title that says
 * nothing on its own, and a body whose point falls past the fold.
 *
 * Deliberately plain rather than a photorealistic iPhone frame; the
 * useful signal is the text and where it stops.
 */
function LockScreenPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-brand-border)] bg-[var(--color-brand-surface,#f6f7f5)] p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">
        How it arrives
      </p>
      <div className="rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-brand-primary,#15a34a)] text-[11px] font-bold text-white">
            FSI
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--color-brand-fg,#111)]">
              {title || 'Your title appears here'}
            </p>
            {/* Two lines is what a collapsed notification shows. Anything
                past this is only seen if the farmer expands it, which
                most never do. */}
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[var(--color-brand-muted)]">
              {body || 'Your message appears here.'}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--color-brand-muted)]">
        Collapsed notifications show about two lines. Put the point first.
      </p>
    </div>
  );
}
