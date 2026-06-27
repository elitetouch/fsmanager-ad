'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check, Globe, Loader2, MapPin, Plus, Save, Tag, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { endpoints } from '@/lib/api';

/**
 * PENKEEP pricing — two tables:
 *
 *   1. Country subscription pricing — one row per country, holds the
 *      per-cycle rate (e.g. NG: 30,000 NGN / 6 weeks). Allocations
 *      snapshot this onto pen_devices.subscription_price at allocation
 *      time, so changing the rate here doesn't surprise-bill anyone
 *      mid-cycle.
 *
 *   2. Per-state installation fees — one row per (country, state).
 *      Lagos vs Adamawa vs Cross River carry different logistics
 *      costs. A state_name = "*" row is the country-level default
 *      when no exact match is found.
 */
export default function DevicePricingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="PENKEEP pricing"
        description="Per-country subscription pricing and per-state installation fees. The order builder uses these to quote new allocations; existing devices keep their snapshotted price."
      />

      <CountryPricingSection />
      <InstallationFeesSection />
    </div>
  );
}

/* ─────────────────────────── Country pricing ─────────────────────────── */

function CountryPricingSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['pen-device-pricing'],
    queryFn: () => endpoints.listPenDevicePricing(),
  });

  const [editing, setEditing] = useState<string | null>(null); // country_code being edited or 'NEW'

  const upsert = useMutation({
    mutationFn: endpoints.upsertPenDevicePricing,
    onSuccess: () => {
      toast.success('Pricing saved.');
      qc.invalidateQueries({ queryKey: ['pen-device-pricing'] });
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save pricing.'),
  });

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-[var(--color-brand-border)] p-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-[var(--color-brand-primary-deep)]" />
          <h2 className="text-[14px] font-bold">Country subscription pricing</h2>
        </div>
        <Button size="sm" onClick={() => setEditing('NEW')} disabled={editing === 'NEW'}>
          <Plus className="h-3.5 w-3.5" />
          Add country
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (data?.pricing?.length ?? 0) === 0 && editing !== 'NEW' ? (
        <EmptyState
          icon={Tag}
          title="No pricing set yet"
          description="Start with Nigeria — 30,000 NGN / cycle / 6 weeks."
          action={
            <Button size="sm" onClick={() => setEditing('NEW')}>
              <Plus className="h-3.5 w-3.5" />
              Add country
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Country</TH>
              <TH>Subscription / cycle</TH>
              <TH>Cycle length</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {editing === 'NEW' && (
              <CountryEditRow
                initial={null}
                onCancel={() => setEditing(null)}
                onSubmit={(payload) => upsert.mutate(payload)}
                submitting={upsert.isPending}
              />
            )}
            {(data?.pricing ?? []).map((p) => (
              editing === p.country_code ? (
                <CountryEditRow
                  key={p.country_code}
                  initial={p}
                  onCancel={() => setEditing(null)}
                  onSubmit={(payload) => upsert.mutate(payload)}
                  submitting={upsert.isPending}
                />
              ) : (
                <TR key={p.country_code}>
                  <TD className="font-mono text-[12.5px] font-bold">{p.country_code}</TD>
                  <TD>{p.currency} {p.subscription_price.toLocaleString()}</TD>
                  <TD>{p.cycle_weeks} weeks</TD>
                  <TD>
                    {p.is_active
                      ? <Badge tone="success">Active</Badge>
                      : <Badge tone="neutral">Inactive</Badge>}
                  </TD>
                  <TD className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p.country_code)}>
                      Edit
                    </Button>
                  </TD>
                </TR>
              )
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function CountryEditRow({
  initial, onCancel, onSubmit, submitting,
}: {
  initial: null | {
    country_code: string;
    subscription_price: number;
    currency: string;
    cycle_weeks: number;
    is_active: boolean;
  };
  onCancel: () => void;
  onSubmit: (p: Parameters<typeof endpoints.upsertPenDevicePricing>[0]) => void;
  submitting: boolean;
}) {
  const [code, setCode] = useState(initial?.country_code ?? 'NG');
  const [price, setPrice] = useState(initial?.subscription_price?.toString() ?? '30000');
  const [currency, setCurrency] = useState(initial?.currency ?? 'NGN');
  const [weeks, setWeeks] = useState(initial?.cycle_weeks?.toString() ?? '6');
  const [active, setActive] = useState(initial?.is_active ?? true);

  return (
    <TR className="bg-[var(--color-brand-bg)]">
      <TD>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          placeholder="NG"
          className="w-16 font-mono"
          disabled={!!initial}
        />
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            maxLength={3}
            placeholder="NGN"
            className="w-20 font-mono"
          />
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="30000"
            className="w-32"
          />
        </div>
      </TD>
      <TD>
        <Input
          value={weeks}
          onChange={(e) => setWeeks(e.target.value)}
          inputMode="numeric"
          placeholder="6"
          className="w-20"
        />
      </TD>
      <TD>
        <label className="inline-flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4"
          />
          Active
        </label>
      </TD>
      <TD className="text-right">
        <div className="inline-flex gap-2">
          <Button
            size="sm"
            onClick={() => onSubmit({
              country_code: code,
              subscription_price: Number(price),
              currency,
              cycle_weeks: Number(weeks),
              is_active: active,
            })}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </TD>
    </TR>
  );
}

/* ─────────────────────────── Installation fees ─────────────────────────── */

function InstallationFeesSection() {
  const qc = useQueryClient();
  const [countryFilter, setCountryFilter] = useState('NG');
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['pen-device-installation-fees', countryFilter],
    queryFn: () => endpoints.listPenDeviceInstallationFees(countryFilter),
  });

  const upsert = useMutation({
    mutationFn: endpoints.upsertPenDeviceInstallationFee,
    onSuccess: () => {
      toast.success('Installation fee saved.');
      qc.invalidateQueries({ queryKey: ['pen-device-installation-fees'] });
      setAdding(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save fee.'),
  });

  const remove = useMutation({
    mutationFn: endpoints.deletePenDeviceInstallationFee,
    onSuccess: () => {
      toast.success('Removed.');
      qc.invalidateQueries({ queryKey: ['pen-device-installation-fees'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not remove.'),
  });

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-[var(--color-brand-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--color-brand-primary-deep)]" />
          <h2 className="text-[14px] font-bold">Installation fees</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            className="w-20 font-mono"
            placeholder="NG"
          />
          <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="h-3.5 w-3.5" />
            Add state
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Country</TH>
              <TH>State</TH>
              <TH>Fee</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {adding && (
              <InstallationEditRow
                countryDefault={countryFilter}
                onCancel={() => setAdding(false)}
                onSubmit={(p) => upsert.mutate(p)}
                submitting={upsert.isPending}
              />
            )}
            {(data?.fees ?? []).map((f) => (
              <TR key={f.id}>
                <TD className="font-mono text-[12.5px]">{f.country_code}</TD>
                <TD>{f.state_name === '*' ? <em className="text-[var(--color-brand-muted)]">Default</em> : f.state_name}</TD>
                <TD>{f.currency} {f.fee.toLocaleString()}</TD>
                <TD>
                  {f.is_active
                    ? <Badge tone="success">Active</Badge>
                    : <Badge tone="neutral">Inactive</Badge>}
                </TD>
                <TD className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-700"
                    onClick={() => {
                      if (confirm(`Remove fee for ${f.state_name}?`)) remove.mutate(f.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </TD>
              </TR>
            ))}
            {(data?.fees ?? []).length === 0 && !adding && (
              <TR>
                <TD colSpan={5}>
                  <EmptyState
                    icon={MapPin}
                    title={`No fees set for ${countryFilter}`}
                    description={'Add a state — or a "*" row to use one country-wide default.'}
                  />
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function InstallationEditRow({
  countryDefault, onCancel, onSubmit, submitting,
}: {
  countryDefault: string;
  onCancel: () => void;
  onSubmit: (p: Parameters<typeof endpoints.upsertPenDeviceInstallationFee>[0]) => void;
  submitting: boolean;
}) {
  const [code, setCode] = useState(countryDefault);
  const [state, setState] = useState('');
  const [fee, setFee] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [active, setActive] = useState(true);

  return (
    <TR className="bg-[var(--color-brand-bg)]">
      <TD>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          className="w-16 font-mono"
        />
      </TD>
      <TD>
        <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Lagos (or *)" className="w-44" />
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} className="w-20 font-mono" />
          <Input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="numeric" className="w-28" placeholder="10000" />
        </div>
      </TD>
      <TD>
        <label className="inline-flex items-center gap-2 text-[12px]">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          Active
        </label>
      </TD>
      <TD className="text-right">
        <div className="inline-flex gap-2">
          <Button
            size="sm"
            onClick={() => onSubmit({
              country_code: code,
              state_name: state.trim(),
              fee: Number(fee),
              currency,
              is_active: active,
            })}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </TD>
    </TR>
  );
}
