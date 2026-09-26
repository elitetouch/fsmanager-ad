'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Ban, Check, CheckCircle2, Copy, KeyRound, Loader2, Pencil, Plus, RefreshCw, ShieldAlert, Unlink,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PARTNER_SCOPES, PartnerForm, type PartnerFormValues } from '@/components/forms/partner-form';
import { apiErrorMessage, apiFieldErrors, endpoints, type ApiPartnerKey, type PartnerScope } from '@/lib/api';
import { fmtDate, fmtDateTime, fmtRelative } from '@/lib/format';
import { adminCan, readAdmin } from '@/lib/auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.fsinnovation.net').replace(/\/+$/, '');

const ACTION_LABELS: Record<string, string> = {
  'partners.create': 'Partner created',
  'partners.update': 'Details updated',
  'partners.suspend': 'Partner suspended',
  'partners.activate': 'Partner reactivated',
  'partners.keys.issue': 'API key issued',
  'partners.keys.rotate': 'API key rotated',
  'partners.keys.revoke': 'API key revoked',
  'partners.devices.allocate': 'Device allocated',
  'partners.devices.release': 'Device released',
};

type Confirm = {
  title: string;
  body: string;
  action: string;
  danger?: boolean;
  run: () => Promise<unknown>;
};

type NewKey = { name: string; plain: string; rotatedFrom?: ApiPartnerKey };

const scopeLabel = (key: string) => PARTNER_SCOPES.find((s) => s.key === key)?.label ?? key;

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const canManage = adminCan(readAdmin(), 'partners.manage');

  const detail = useQuery({ queryKey: ['api-partner', id], queryFn: () => endpoints.showApiPartner(id) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['api-partner', id] });
    qc.invalidateQueries({ queryKey: ['api-partners'] });
  };

  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [newKey, setNewKey] = useState<NewKey | null>(null);

  // A visible new key hasn't been saved anywhere else — warn before leaving.
  useEffect(() => {
    if (!newKey) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [newKey]);

  const update = useMutation({
    mutationFn: (v: PartnerFormValues) => {
      const { slug: _slug, ...rest } = v;
      return endpoints.updateApiPartner(id, rest);
    },
    onSuccess: () => {
      toast.success('Changes saved.');
      setEditing(false);
      refresh();
    },
    onError: (e) => {
      if (Object.keys(apiFieldErrors(e)).length === 0) toast.error(apiErrorMessage(e));
    },
  });

  async function runConfirm() {
    if (!confirm) return;
    setConfirming(true);
    try {
      await confirm.run();
      setConfirm(null);
      refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setConfirming(false);
    }
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        icon={KeyRound}
        title="Partner not found"
        description={apiErrorMessage(detail.error, 'It may have been removed.')}
        action={<Button asChild variant="secondary"><Link href="/partners">Back to partners</Link></Button>}
      />
    );
  }

  const { partner, keys, devices, activity } = detail.data;
  const active = partner.status === 'active';
  const activeKeys = keys.filter((k) => k.state === 'active').length;

  return (
    <div className="space-y-5">
      <Link href="/partners" className="inline-flex items-center gap-1 text-sm text-[var(--color-brand-muted)] hover:text-[var(--color-brand-fg)]">
        <ArrowLeft className="h-3.5 w-3.5" /> API partners
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {partner.name}
            {active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Suspended</Badge>}
          </span>
        }
        description={
          <>
            <span className="font-mono">{partner.slug}</span>
            {partner.description ? <> · {partner.description}</> : null}
          </>
        }
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              {active ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-[var(--color-brand-danger)]"
                  onClick={() =>
                    setConfirm({
                      title: `Suspend ${partner.name}?`,
                      body: 'Every API request from this partner will be refused straight away. Their devices keep recording data. You can reactivate them at any time.',
                      action: 'Suspend partner',
                      danger: true,
                      run: () => endpoints.suspendApiPartner(id).then(() => toast.success(`${partner.name} suspended.`)),
                    })
                  }
                >
                  <Ban className="h-3.5 w-3.5" /> Suspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => endpoints.activateApiPartner(id).then(() => { toast.success(`${partner.name} is active again.`); refresh(); }).catch((e) => toast.error(apiErrorMessage(e)))}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reactivate
                </Button>
              )}
            </div>
          )
        }
      />

      {!active && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-[color:rgb(220_38_38/0.25)] bg-[color:rgb(220_38_38/0.06)] px-4 py-3 text-sm text-[var(--color-brand-danger)]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Suspended {partner.suspended_at ? fmtRelative(partner.suspended_at) : ''}. All API requests from {partner.name} are being refused.</span>
        </div>
      )}

      {newKey && <KeyReveal newKey={newKey} partnerContact={partner.contact_name} onDone={() => setNewKey(null)} />}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {/* ───────── Keys ───────── */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>API keys</CardTitle>
                <CardDescription>
                  Sent as the <code>X-Partner-Key</code> header. Use one key per environment, like Production and Staging.
                </CardDescription>
              </div>
              {activeKeys === 0 && <Badge tone="warning">No active key</Badge>}
            </CardHeader>
            {keys.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-[var(--color-brand-muted)]">No keys yet — the partner can&apos;t call the API until you issue one.</p>
            ) : (
              <Table>
                <THead><TR><TH>Key</TH><TH>Status</TH><TH className="hidden md:table-cell">Last used</TH><TH><span className="sr-only">Actions</span></TH></TR></THead>
                <TBody>
                  {keys.map((k) => (
                    <TR key={k.id}>
                      <TD>
                        <div className="font-semibold">{k.name}</div>
                        <div className="whitespace-nowrap font-mono text-xs text-[var(--color-brand-muted)]">{k.masked}</div>
                        <div className="text-xs text-[var(--color-brand-muted)]">
                          Created {fmtDate(k.created_at)}
                          {k.expires_at && k.state === 'active' && <> · expires {fmtRelative(k.expires_at)}</>}
                          {k.scopes && <> · only {k.scopes.map(scopeLabel).join(', ')}</>}
                        </div>
                      </TD>
                      <TD>
                        {k.state === 'active' && <Badge tone="success">Active</Badge>}
                        {k.state === 'expired' && <Badge tone="muted">Expired</Badge>}
                        {k.state === 'revoked' && <Badge tone="danger">Revoked</Badge>}
                      </TD>
                      <TD className="hidden text-xs text-[var(--color-brand-muted)] md:table-cell">
                        {k.last_used_at ? (
                          <>{fmtRelative(k.last_used_at)}<div className="font-mono">{k.last_used_ip}</div></>
                        ) : 'Never'}
                      </TD>
                      <TD className="text-right">
                        {canManage && k.state === 'active' && (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              title="Replace with a new key"
                              onClick={() =>
                                setConfirm({
                                  title: `Rotate “${k.name}”?`,
                                  body: 'A new key is issued now. The current key keeps working for 24 hours so the partner can switch over, then stops.',
                                  action: 'Rotate key',
                                  run: () =>
                                    endpoints.rotateApiPartnerKey(id, k.id).then((r) =>
                                      setNewKey({ name: r.key.name, plain: r.plain_key, rotatedFrom: r.old_key }),
                                    ),
                                })
                              }
                            >
                              <RefreshCw className="h-3.5 w-3.5" /> Rotate
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-[var(--color-brand-danger)]"
                              onClick={() =>
                                setConfirm({
                                  title: `Revoke “${k.name}”?`,
                                  body: "Requests using this key are refused immediately. This can't be undone — you'd issue a new key instead.",
                                  action: 'Revoke key',
                                  danger: true,
                                  run: () => endpoints.revokeApiPartnerKey(id, k.id).then(() => toast.success(`Key “${k.name}” revoked.`)),
                                })
                              }
                            >
                              Revoke
                            </Button>
                          </div>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
            {canManage && (
              <IssueKeyForm
                partnerScopes={partner.scopes}
                disabled={!active}
                firstKey={keys.length === 0}
                onIssue={(payload) =>
                  endpoints.issueApiPartnerKey(id, payload).then((r) => {
                    setNewKey({ name: r.key.name, plain: r.plain_key });
                    refresh();
                  })
                }
              />
            )}
          </Card>

          {/* ───────── Devices ───────── */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>PENKEEP devices</CardTitle>
                <CardDescription>
                  Devices this partner may use. They can only see and control devices allocated here.
                </CardDescription>
              </div>
              <Badge tone="muted">{devices.length}</Badge>
            </CardHeader>
            {devices.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-[var(--color-brand-muted)]">No devices allocated yet.</p>
            ) : (
              <Table>
                <THead><TR><TH>Device</TH><TH>Used for</TH><TH className="hidden md:table-cell">Last seen</TH><TH><span className="sr-only">Actions</span></TH></TR></THead>
                <TBody>
                  {devices.map((d) => (
                    <TR key={d.id}>
                      <TD>
                        <div className="whitespace-nowrap font-mono text-sm font-semibold">{d.device_id}</div>
                        {d.label && <div className="text-xs text-[var(--color-brand-muted)]">{d.label}</div>}
                      </TD>
                      <TD className="text-sm">
                        {d.partner_target_type ? (
                          <>
                            {d.partner_target_type === 'farm' ? 'Farm' : 'Storage'}
                            {d.partner_label ? <> · {d.partner_label}</> : null}
                            <div className="font-mono text-xs text-[var(--color-brand-muted)]">ref {d.partner_target_ref}</div>
                          </>
                        ) : (
                          <span className="text-[var(--color-brand-muted)]">Not linked yet</span>
                        )}
                      </TD>
                      <TD className="hidden md:table-cell">
                        {d.online ? <Badge tone="success">Online</Badge> : <Badge tone="muted">Offline</Badge>}
                        <div className="text-xs text-[var(--color-brand-muted)]">{d.last_seen_at ? fmtRelative(d.last_seen_at) : 'Never seen'}</div>
                      </TD>
                      <TD className="text-right">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Return to inventory"
                            onClick={() =>
                              setConfirm({
                                title: `Release ${d.device_id}?`,
                                body: `${partner.name} will immediately lose access to this device. It goes back to inventory, ready to allocate to a farm or another partner.`,
                                action: 'Release device',
                                danger: true,
                                run: () => endpoints.releaseDeviceFromPartner(id, d.device_id).then(() => toast.success(`${d.device_id} released.`)),
                              })
                            }
                          >
                            <Unlink className="h-3.5 w-3.5" /> Release
                          </Button>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
            {canManage && <AllocateDeviceForm disabled={!active} onAllocate={(deviceId) => endpoints.allocateDeviceToPartner(id, deviceId).then((r) => { toast.success(`${r.device.device_id} allocated to ${partner.name}.`); refresh(); })} />}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          {/* ───────── Details ───────── */}
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-3 px-5 pb-5 text-sm">
              <dt className="text-[var(--color-brand-muted)]">Permissions</dt>
              <dd className="flex flex-wrap gap-1">{partner.scopes.map((s) => <Badge key={s} tone="primary">{scopeLabel(s)}</Badge>)}</dd>
              <dt className="text-[var(--color-brand-muted)]">Rate limit</dt>
              <dd>{partner.rate_limit_per_minute.toLocaleString()} requests / min</dd>
              <dt className="text-[var(--color-brand-muted)]">Allowed IPs</dt>
              <dd className="break-words font-mono text-xs">{partner.ip_allowlist.length ? partner.ip_allowlist.join(', ') : <span className="font-sans text-sm">Any IP</span>}</dd>
              <dt className="text-[var(--color-brand-muted)]">Contact</dt>
              <dd className="min-w-0">
                {partner.contact_name ?? '—'}
                {partner.contact_email && <div><a className="break-all text-[var(--color-brand-primary)] hover:underline" href={`mailto:${partner.contact_email}`}>{partner.contact_email}</a></div>}
                {partner.contact_phone && <div>{partner.contact_phone}</div>}
              </dd>
              <dt className="text-[var(--color-brand-muted)]">Created</dt>
              <dd>{fmtDate(partner.created_at)}</dd>
            </dl>
          </Card>

          {/* ───────── Quick start ───────── */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>How they connect</CardTitle>
                <CardDescription>Send this to their developers with the key (see the API docs: Partner API).</CardDescription>
              </div>
            </CardHeader>
            <div className="px-5 pb-5">
              <CopyBlock
                text={`curl ${API_BASE}/api/v1/partner/devices \\\n  -H "X-Partner-Key: fsk_live_…" \\\n  -H "Accept: application/json"`}
                label="Copy example"
              />
            </div>
          </Card>

          {/* ───────── Activity ───────── */}
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <div className="px-5 pb-5">
              {activity.length === 0 ? (
                <p className="text-sm text-[var(--color-brand-muted)]">Nothing yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-[var(--color-brand-border)] pl-5">
                  {activity.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--color-brand-primary)] ring-4 ring-white" />
                      <div className="text-sm font-medium">{ACTION_LABELS[a.action] ?? a.action}{activityDetail(a.payload)}</div>
                      <div className="text-xs text-[var(--color-brand-muted)]" title={fmtDateTime(a.created_at)}>
                        {fmtRelative(a.created_at)} · {a.admin?.name ?? 'System'}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit */}
      <Dialog open={editing} onOpenChange={(o) => { setEditing(o); if (!o) update.reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {partner.name}</DialogTitle>
            <DialogDescription>Permission and IP changes apply to their next API request.</DialogDescription>
          </DialogHeader>
          <PartnerForm partner={partner} submitting={update.isPending} errors={apiFieldErrors(update.error)} submitLabel="Save changes" onSubmit={(v) => update.mutate(v)} />
        </DialogContent>
      </Dialog>

      {/* Confirm */}
      <Dialog open={confirm !== null} onOpenChange={(o) => { if (!o && !confirming) setConfirm(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary" autoFocus disabled={confirming}>Cancel</Button></DialogClose>
            <Button variant={confirm?.danger ? 'danger' : 'primary'} onClick={runConfirm} disabled={confirming}>
              {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirm?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function activityDetail(payload: Record<string, unknown> | null): string {
  if (!payload) return '';
  const key = payload['name'] ?? payload['new_key'] ?? payload['device_id'];
  return typeof key === 'string' ? ` — ${key}` : '';
}

/** The one-time reveal. The full key is never available again after this. */
function KeyReveal({ newKey, partnerContact, onDone }: { newKey: NewKey; partnerContact: string | null; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <section
      aria-labelledby="new-key-title"
      className="rounded-xl border-2 border-[#f59e0b] bg-gradient-to-b from-[#fff7e0] to-white p-5 shadow-sm"
    >
      <h2 id="new-key-title" className="flex items-center gap-2 text-base font-semibold">
        <AlertTriangle className="h-5 w-5 text-[#b45309]" /> Copy the new “{newKey.name}” key now
      </h2>
      <p className="mt-1 text-sm text-[var(--color-brand-fg)]">
        <strong>You won&apos;t see it again</strong> — FarmSpeak keeps only a fingerprint of it. Send it to {partnerContact ?? 'the partner'} through a password manager or another secure channel, never plain email or WhatsApp.
      </p>
      <div className="mt-3 flex gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-[#0f2a17] px-3 py-2.5 font-mono text-sm text-[#dff5e3]">{newKey.plain}</code>
        <Button
          onClick={() => navigator.clipboard.writeText(newKey.plain).then(() => { setCopied(true); toast.success('Key copied.'); })}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {newKey.rotatedFrom?.expires_at && (
        <p className="mt-2 text-xs text-[var(--color-brand-muted)]">
          The old key keeps working until {fmtDateTime(newKey.rotatedFrom.expires_at)} so they can switch without downtime.
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onDone} disabled={!copied} title={copied ? undefined : 'Copy the key first'}>
          I&apos;ve stored it safely
        </Button>
      </div>
    </section>
  );
}

function IssueKeyForm({
  partnerScopes, disabled, firstKey, onIssue,
}: {
  partnerScopes: PartnerScope[];
  disabled: boolean;
  firstKey: boolean;
  onIssue: (p: { name: string; expires_in_days?: 30 | 90 | 365; scopes?: PartnerScope[] }) => Promise<void>;
}) {
  const [name, setName] = useState(firstKey ? 'Production' : '');
  const [expiry, setExpiry] = useState<'365' | '90' | '30' | 'never'>('365');
  const [scopes, setScopes] = useState<PartnerScope[]>(partnerScopes);
  const [busy, setBusy] = useState(false);

  useEffect(() => setScopes(partnerScopes), [partnerScopes]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (scopes.length === 0) {
      toast.error('A key needs at least one permission.');
      return;
    }
    setBusy(true);
    try {
      await onIssue({
        name: name.trim(),
        expires_in_days: expiry === 'never' ? undefined : (Number(expiry) as 30 | 90 | 365),
        scopes: scopes.length < partnerScopes.length ? scopes : undefined,
      });
      setName('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-[var(--color-brand-border)] px-5 py-4">
      <h3 className="text-sm font-semibold">Issue a key</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="key-name">Name</Label>
          <Input id="key-name" value={name} maxLength={60} required placeholder="Production" onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="key-expiry">Expires</Label>
          <select
            id="key-expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as typeof expiry)}
            className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="365">1 year (recommended)</option>
            <option value="90">90 days</option>
            <option value="30">30 days</option>
            <option value="never">Never</option>
          </select>
        </div>
      </div>
      {partnerScopes.length > 1 && (
        <fieldset>
          <legend className="text-sm font-medium">This key can</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {partnerScopes.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-brand-border)] bg-white px-2.5 py-1.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-brand-primary)]"
                  checked={scopes.includes(s)}
                  onChange={() => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                />
                {scopeLabel(s)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || disabled || name.trim() === ''}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Issue key
        </Button>
        {disabled && <span className="text-xs text-[var(--color-brand-muted)]">Reactivate the partner to issue keys.</span>}
      </div>
    </form>
  );
}

function AllocateDeviceForm({ disabled, onAllocate }: { disabled: boolean; onAllocate: (deviceId: string) => Promise<void> }) {
  const [deviceId, setDeviceId] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onAllocate(deviceId.trim().toUpperCase());
      setDeviceId('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 border-t border-[var(--color-brand-border)] px-5 py-4">
      <div className="min-w-[220px] flex-1">
        <Label htmlFor="alloc-device">Allocate a device</Label>
        <Input
          id="alloc-device"
          className="font-mono"
          placeholder="PENKEEP-A1B2C3D4E5F6"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        />
        <p className="mt-1 text-xs text-[var(--color-brand-muted)]">
          The device must be registered on the <Link href="/devices" className="underline">Devices</Link> page and free.
        </p>
      </div>
      <Button type="submit" variant="secondary" disabled={busy || disabled || deviceId.trim() === ''}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Allocate
      </Button>
    </form>
  );
}

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-lg bg-[#0f2a17] px-3 py-2.5 font-mono text-xs leading-relaxed text-[#dff5e3]">{text}</pre>
      <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : label}
      </Button>
    </div>
  );
}
