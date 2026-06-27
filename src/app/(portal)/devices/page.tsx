'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Check, Cpu, Loader2, Power, RefreshCw, Search, Tractor,
} from 'lucide-react';
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

/**
 * PENKEEP devices — fleet management for the super-admin.
 *
 * Three actions per row:
 *   - Allocate to a farm (opens a small inline form for farm_id +
 *     optional installation_fee override)
 *   - Deactivate (publishes deactivate_cmd to the device + flips DB
 *     status to deactivated)
 *   - Resend new_flock_cmd (nudges a device that hasn't acked the
 *     previous push)
 *
 * The status pill colour-codes lifecycle:
 *   green  → active     (allocated + paid)
 *   amber  → expired    (allocated, subscription lapsed)
 *   rose   → deactivated (admin-killed)
 *   muted  → unallocated (in inventory)
 */
export default function DevicesPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pen-devices', { q, status, page }],
    queryFn: () => endpoints.listPenDevices({ q, status, page, per_page: perPage }),
  });

  const devices = (data?.devices ?? []) as DeviceRow[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="PENKEEP devices"
        description="Every PENKEEP unit known to the platform — allocate to farms, deactivate when subscriptions lapse, and resend cycle commands to devices that haven't acked."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Device ID, label, or serial…"
              className="pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-10 rounded-lg border border-[var(--color-brand-input-border)] bg-white px-3 text-[13px] text-[var(--color-brand-fg)]"
          >
            <option value="">All statuses</option>
            <option value="unallocated">Unallocated</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            icon={Cpu}
            title="No devices match"
            description="Adjust filters, or wait for a PENKEEP to send its first telemetry — they auto-register on first message."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Device</TH>
                <TH>Status</TH>
                <TH>Farm</TH>
                <TH>Last seen</TH>
                <TH>Subscription</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {devices.map((d) => (
                <DeviceRowComponent key={d.id} d={d} />
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {data?.meta && data.meta.last_page > 1 && (
        <Pagination
          page={data.meta.current_page}
          lastPage={data.meta.last_page}
          total={data.meta.total}
          perPage={perPage}
          onChange={setPage}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Row ─────────────────────────── */

type DeviceRow = {
  id: string;
  device_id: string;
  label: string | null;
  status: string;
  farm_id: string | null;
  farm: { id: string; name: string } | null;
  pen: { id: string; name: string } | null;
  last_seen_at: string | null;
  billing_ends_at: string | null;
  firmware_version: string | null;
};

function DeviceRowComponent({ d }: { d: DeviceRow }) {
  const qc = useQueryClient();
  const [allocating, setAllocating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const allocate = useMutation({
    mutationFn: (vars: { farm_id: string; installation_fee?: number }) =>
      endpoints.allocatePenDevice(d.id, vars),
    onSuccess: () => {
      toast.success('Device allocated.');
      qc.invalidateQueries({ queryKey: ['pen-devices'] });
      setAllocating(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not allocate.'),
  });

  const deactivate = useMutation({
    mutationFn: (reason?: string) => endpoints.deactivatePenDevice(d.id, reason),
    onSuccess: (res) => {
      toast.success(res.mqtt_published
        ? 'Deactivated and command sent to device.'
        : 'Deactivated locally. Device will pick it up on next contact.');
      qc.invalidateQueries({ queryKey: ['pen-devices'] });
      setConfirmDeactivate(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not deactivate.'),
  });

  const resend = useMutation({
    mutationFn: () => endpoints.resendFlockCmd(d.id),
    onSuccess: (res) => toast[res.mqtt_published ? 'success' : 'warning'](
      res.mqtt_published ? 'Command sent.' : 'Could not reach the device.',
    ),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not send.'),
  });

  return (
    <>
      <TR>
        <TD>
          <p className="font-mono text-[12.5px] font-semibold">{d.device_id}</p>
          {d.label && <p className="text-[11.5px] text-[var(--color-brand-muted)]">{d.label}</p>}
        </TD>
        <TD><StatusBadge status={d.status} /></TD>
        <TD>
          {d.farm ? (
            <span className="inline-flex items-center gap-1 text-[12.5px]">
              <Tractor className="h-3.5 w-3.5 text-[var(--color-brand-muted)]" />
              {d.farm.name}
              {d.pen && <span className="text-[var(--color-brand-muted)]"> · {d.pen.name}</span>}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--color-brand-muted)]">—</span>
          )}
        </TD>
        <TD className="text-[12px]">{relativeTime(d.last_seen_at)}</TD>
        <TD className="text-[12px]">
          {d.billing_ends_at ? `ends ${fmtDate(d.billing_ends_at)}` : '—'}
        </TD>
        <TD className="text-right">
          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
            {d.status === 'unallocated' || d.status === 'expired' ? (
              <Button size="sm" onClick={() => setAllocating((v) => !v)}>
                Allocate
              </Button>
            ) : null}
            {d.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => resend.mutate()} disabled={resend.isPending}>
                {resend.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Resync
              </Button>
            )}
            {d.status !== 'deactivated' && (
              <Button
                size="sm"
                variant="outline"
                className="text-rose-700"
                onClick={() => setConfirmDeactivate(true)}
              >
                <Power className="h-3.5 w-3.5" />
                Deactivate
              </Button>
            )}
          </div>
        </TD>
      </TR>

      {allocating && (
        <TR className="bg-[var(--color-brand-bg)]">
          <TD colSpan={6}>
            <AllocateForm
              onCancel={() => setAllocating(false)}
              onSubmit={(vars) => allocate.mutate(vars)}
              submitting={allocate.isPending}
            />
          </TD>
        </TR>
      )}

      {confirmDeactivate && (
        <TR className="bg-rose-50/60">
          <TD colSpan={6}>
            <DeactivateConfirm
              onCancel={() => setConfirmDeactivate(false)}
              onConfirm={(reason) => deactivate.mutate(reason)}
              submitting={deactivate.isPending}
            />
          </TD>
        </TR>
      )}
    </>
  );
}

function AllocateForm({
  onSubmit, onCancel, submitting,
}: {
  onSubmit: (vars: { farm_id: string; installation_fee?: number }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [farmId, setFarmId] = useState('');
  const [fee, setFee] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!farmId.trim()) return;
        onSubmit({
          farm_id: farmId.trim(),
          installation_fee: fee.trim() === '' ? undefined : Number(fee),
        });
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
          Farm UUID
        </label>
        <Input value={farmId} onChange={(e) => setFarmId(e.target.value)} placeholder="019e8c87-…" />
      </div>
      <div className="w-full sm:w-40">
        <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
          Installation fee
        </label>
        <Input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="(optional)" inputMode="numeric" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Allocate
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeactivateConfirm({
  onConfirm, onCancel, submitting,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-rose-900">
            Deactivate this device?
          </p>
          <p className="mt-0.5 text-[11.5px] text-rose-900">
            We&rsquo;ll publish <code className="font-mono">deactivate_cmd</code> and the device will stop logging until reactivated.
          </p>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, shown in audit log)"
            className="mt-2"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-rose-600 hover:bg-rose-700"
          onClick={() => onConfirm(reason)}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          Yes, deactivate
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
    active: { tone: 'success', label: 'Active' },
    expired: { tone: 'warning', label: 'Expired' },
    deactivated: { tone: 'danger', label: 'Deactivated' },
    unallocated: { tone: 'neutral', label: 'Unallocated' },
  };
  const v = map[status] ?? { tone: 'neutral' as const, label: status };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const t = new Date(iso).getTime();
    const secs = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86_400)}d ago`;
  } catch {
    return '—';
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
