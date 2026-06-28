'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle, Check, Cpu, Loader2, Plus, Power, PowerOff, Printer, QrCode, RefreshCw, Search, Tractor, Trash2, X,
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const perPage = 25;
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pen-devices', { q, status, page }],
    queryFn: () => endpoints.listPenDevices({ q, status, page, per_page: perPage }),
  });

  const devices = (data?.devices ?? []) as DeviceRow[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="PENKEEP devices"
        description="Every PENKEEP unit known to the platform — pre-register new units before they ship, allocate to farms, deactivate when subscriptions lapse, and resend cycle commands to devices that haven't acked."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add device
            </Button>
          </div>
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

      {registerOpen && (
        <RegisterDeviceDialog
          onClose={() => setRegisterOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['pen-devices'] });
            setRegisterOpen(false);
          }}
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showQr, setShowQr] = useState(false);

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

  const activate = useMutation({
    mutationFn: () => endpoints.activatePenDevice(d.id),
    onSuccess: (res) => {
      toast.success(res.mqtt_published
        ? 'Device reactivated and new_flock_cmd re-sent.'
        : 'Device reactivated. No active flock to re-arm.');
      qc.invalidateQueries({ queryKey: ['pen-devices'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not activate.'),
  });

  const remove = useMutation({
    mutationFn: () => endpoints.deletePenDevice(d.id),
    onSuccess: () => {
      toast.success(`Removed ${d.device_id}.`);
      qc.invalidateQueries({ queryKey: ['pen-devices'] });
      setConfirmDelete(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not remove device.'),
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
            {d.status === 'deactivated' && (
              <Button
                size="sm"
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
              >
                {activate.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <PowerOff className="h-3.5 w-3.5" />}
                Activate
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowQr(true)}
              aria-label="QR code sticker"
              title="QR code sticker"
            >
              <QrCode className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-rose-700"
              onClick={() => setConfirmDelete(true)}
              aria-label="Remove device"
              title="Remove device"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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

      {confirmDelete && (
        <TR className="bg-rose-50/60">
          <TD colSpan={6}>
            <DeleteConfirm
              deviceId={d.device_id}
              onCancel={() => setConfirmDelete(false)}
              onConfirm={() => remove.mutate()}
              submitting={remove.isPending}
            />
          </TD>
        </TR>
      )}

      {showQr && (
        <QrStickerDialog
          deviceId={d.device_id}
          label={d.label ?? null}
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  );
}

/* ─────────────────────────── QR sticker dialog ─────────────────────────── */
// One sticker per device. The QR encodes the bare device_id, which is
// what the tenant-app scanner expects (it auto-uppercases and matches
// /^PENKEEP-[A-F0-9]{12}$/). Keeping it plain text means a non-app QR
// reader will just show the id as a string — no confusing deep-link
// behaviour, no privacy leak.
function QrStickerDialog({
  deviceId, label, onClose,
}: {
  deviceId: string;
  label: string | null;
  onClose: () => void;
}) {
  const stickerRef = useRef<HTMLDivElement | null>(null);

  // Download as PNG by reading the canvas qrcode.react renders.
  function downloadPng() {
    const canvas = stickerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${deviceId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // Browser print — the print-only stylesheet at the bottom of the
  // dialog hides everything except the .sticker block so the printout
  // is just the QR + id on a clean page.
  function printSticker() {
    window.print();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between print:hidden">
            <h2 className="text-[15px] font-bold">Device QR sticker</h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* The printable sticker */}
          <div ref={stickerRef} className="sticker mx-auto flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-brand-border)] bg-white p-4">
            {/* Canvas — used for the PNG download */}
            <QRCodeCanvas
              value={deviceId}
              size={220}
              level="M"
              marginSize={2}
              className="hidden"
            />
            {/* SVG — what the user sees on screen + what prints crisply */}
            <QRCodeSVG
              value={deviceId}
              size={220}
              level="M"
              marginSize={2}
              className="block"
            />
            <div className="text-center">
              <p className="font-mono text-[12px] font-bold tracking-tight">{deviceId}</p>
              {label && (
                <p className="mt-0.5 text-[10.5px] text-[var(--color-brand-muted)]">{label}</p>
              )}
            </div>
          </div>

          <p className="mt-3 text-[11.5px] text-[var(--color-brand-muted)] print:hidden">
            Stick this on the back of the device. Tenant app users scan it from the &ldquo;Pair
            device&rdquo; flow to bind the unit to a pen.
          </p>

          <div className="mt-4 flex justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={downloadPng}>
              <QrCode className="h-3.5 w-3.5" />
              Download PNG
            </Button>
            <Button onClick={printSticker}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .sticker, .sticker * { visibility: visible !important; }
          .sticker {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function DeleteConfirm({
  deviceId, onConfirm, onCancel, submitting,
}: {
  deviceId: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
        <div>
          <p className="text-[12.5px] font-bold text-rose-900">
            Remove device <span className="font-mono">{deviceId}</span>?
          </p>
          <p className="mt-0.5 text-[11.5px] text-rose-900">
            Soft-deletes the row (audit trail preserved). Clears the firmware secret + farm
            assignment. Re-registering the same MAC later restores the original row with a fresh
            secret.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-rose-600 hover:bg-rose-700"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Yes, remove
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
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
  const [farmLabel, setFarmLabel] = useState('');
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
          Farm
        </label>
        <FarmPicker
          value={farmId}
          label={farmLabel}
          onChange={(id, name) => { setFarmId(id); setFarmLabel(name); }}
        />
      </div>
      <div className="w-full sm:w-40">
        <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
          Installation fee
        </label>
        <Input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="(optional)" inputMode="numeric" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting || !farmId}>
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

/* ─────────────────────────── Farm picker ─────────────────────────── */
// Async-search dropdown for farms. Typing ≥2 chars fires a debounced
// /admin/farms?q=... call; results render as click-to-select rows
// showing farm name + country code. Selecting one stores the UUID and
// shows it as a removable chip so admin can confirm at a glance.
function FarmPicker({
  value, label, onChange,
}: {
  value: string;
  label: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  // Position the portaled dropdown directly under the input. We need
  // viewport coordinates because the dropdown is rendered in document.body
  // to escape ancestor overflow:hidden (the Card wrapping the device table).
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input — typing fast shouldn't hammer the API.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Outside-click closes — checks against both the wrapper (the input)
  // AND the portaled dropdown, since the dropdown is no longer a DOM
  // descendant of the wrapper.
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const insideWrapper = wrapperRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideWrapper && !insideDropdown) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Measure the input's viewport position whenever the dropdown opens
  // or the user scrolls / resizes. useLayoutEffect avoids a one-frame
  // flash of the dropdown in the wrong spot.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return;
    function measure() {
      const el = wrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ['farm-picker', debounced],
    queryFn: () => endpoints.listFarms({ q: debounced, per_page: 12 }),
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  });

  const farms = (data?.farms ?? []) as Array<{
    id: string;
    name: string;
    country_code?: string | null;
    state?: string | null;
  }>;

  // Selected-state chip view.
  if (value && !open) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-brand-input-border)] bg-white px-3 py-2">
        <Tractor className="h-3.5 w-3.5 text-[var(--color-brand-muted)]" />
        <span className="flex-1 text-[12.5px] font-semibold text-[var(--color-brand-fg)]">
          {label || value}
        </span>
        <button
          type="button"
          onClick={() => { onChange('', ''); setOpen(true); setQuery(''); }}
          className="rounded p-1 text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)]"
          aria-label="Clear"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // The dropdown itself — split out so we can portal it without
  // duplicating the JSX.
  const dropdown = (
    <div
      ref={dropdownRef}
      style={dropdownRect
        ? { position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, zIndex: 60 }
        : { display: 'none' }
      }
      className="overflow-hidden rounded-lg border border-[var(--color-brand-border)] bg-white shadow-lg"
    >
      {debounced.length < 2 ? (
        <p className="p-3 text-[12px] text-[var(--color-brand-muted)]">
          Type at least 2 characters to search.
        </p>
      ) : isFetching ? (
        <p className="flex items-center gap-2 p-3 text-[12px] text-[var(--color-brand-muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching…
        </p>
      ) : farms.length === 0 ? (
        <p className="p-3 text-[12px] text-[var(--color-brand-muted)]">
          No farms match &ldquo;{debounced}&rdquo;.
        </p>
      ) : (
        <>
          <p className="border-b border-[var(--color-brand-border)] bg-[var(--color-brand-bg)] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-brand-muted)]">
            Tap a farm to select
          </p>
          <ul className="max-h-64 overflow-y-auto">
            {farms.map((f) => (
              <li key={f.id}>
                {/* onMouseDown (not onClick) so selection fires BEFORE
                    the document-level outside-click handler closes the
                    dropdown — both use mousedown, so without
                    preventDefault here the button would unmount before
                    click could fire. */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(f.id, f.name);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-[var(--color-brand-bg)]"
                >
                  <p className="text-[12.5px] font-semibold text-[var(--color-brand-fg)]">
                    {f.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-brand-muted)]">
                    {[f.country_code, f.state].filter(Boolean).join(' · ') || 'No region'}
                    <span className="ml-2 font-mono">{f.id.slice(0, 8)}…</span>
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-brand-muted)]" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Type farm name to search…"
          className="pl-9"
        />
      </div>

      {open && typeof window !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}

/* ─────────────────────────── Register device dialog ─────────────────────────── */
// Pre-register a new PENKEEP unit in the system before it ever boots.
// device_id is the only required field — MAC-derived, e.g.
// PENKEEP-88E48EB5AA8C — and is auto-uppercased so handwritten tags
// don't fail validation. Optional label + serial help inventory tracking.
function RegisterDeviceDialog({
  onClose, onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deviceId, setDeviceId] = useState('');
  const [label, setLabel] = useState('');
  const [serial, setSerial] = useState('');
  const [channel, setChannel] = useState<'stable' | 'beta' | 'canary'>('stable');

  const create = useMutation({
    mutationFn: () => endpoints.createPenDevice({
      device_id: deviceId.trim().toUpperCase(),
      label: label.trim() || undefined,
      serial_number: serial.trim() || undefined,
      firmware_channel: channel,
    }),
    onSuccess: (res) => {
      toast.success(res.created
        ? `Device ${deviceId.toUpperCase()} registered.`
        : `Device already existed — record returned.`);
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not register device.'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^PENKEEP-[A-F0-9]{12}$/i.test(deviceId.trim())) {
      toast.error('Device ID must be PENKEEP- followed by 12 hex characters (MAC).');
      return;
    }
    create.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Register PENKEEP device</h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-4 text-[12px] text-[var(--color-brand-muted)]">
            Pre-register a unit before it boots. The device ID is on the sticker / printed on the
            PCB — e.g. <span className="font-mono">PENKEEP-88E48EB5AA8C</span>. The firmware
            secret is generated automatically.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                Device ID <span className="text-rose-700">*</span>
              </label>
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="PENKEEP-XXXXXXXXXXXX"
                className="font-mono"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                  Label
                </label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="(optional)"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                  Serial number
                </label>
                <Input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="(optional)"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                Firmware channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'stable' | 'beta' | 'canary')}
                className="h-10 w-full rounded-lg border border-[var(--color-brand-input-border)] bg-white px-3 text-[13px] text-[var(--color-brand-fg)]"
              >
                <option value="stable">stable</option>
                <option value="beta">beta</option>
                <option value="canary">canary</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !deviceId.trim()}>
                {create.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Register
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
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
