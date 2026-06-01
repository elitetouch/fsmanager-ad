'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Loader2, PlusCircle, Stethoscope, Syringe, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';

type Item = {
  id?: string;
  sequence?: number;
  kind?: 'vaccine' | 'treatment';
  disease_target?: string;
  name?: string;
  vaccine_strain?: string | null;
  method?: ItemMethod;
  age_days?: number;
  window_days?: number;
  dosage?: string | null;
  critical?: boolean;
  alt_names?: string[] | null;
  notes?: string | null;
};

type ItemMethod =
  | 'eye_drop' | 'nasal_drop' | 'drinking_water' | 'wing_web'
  | 'injection_im' | 'injection_sc' | 'spray' | 'oral';

const METHODS: { value: ItemMethod; label: string }[] = [
  { value: 'eye_drop', label: 'Eye drop' },
  { value: 'nasal_drop', label: 'Nasal drop' },
  { value: 'drinking_water', label: 'Drinking water' },
  { value: 'wing_web', label: 'Wing-web stab' },
  { value: 'injection_im', label: 'Intramuscular' },
  { value: 'injection_sc', label: 'Subcutaneous' },
  { value: 'spray', label: 'Spray' },
  { value: 'oral', label: 'Oral' },
];

const DISEASE_TARGETS = [
  'newcastle', 'gumboro', 'mareks', 'fowlpox', 'fowl_typhoid', 'infectious_coryza',
  'eds', 'ib', 'avian_influenza', 'coccidiosis', 'deworming', 'vitamin_supplement',
  'antibiotic', 'antistress', 'liver_tonic', 'other',
];

export default function ProtocolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const detail = useQuery({
    queryKey: ['protocol', id],
    queryFn: () => endpoints.showProtocol(id),
  });

  const del = useMutation({
    mutationFn: (itemId: string) => endpoints.deleteProtocolItem(id, itemId),
    onSuccess: () => {
      toast.success('Item removed.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['protocol', id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const protocol = detail.data?.protocol;
  const items = ((detail.data?.items ?? []) as Item[])
    .slice()
    .sort((a, b) => (a.age_days ?? 0) - (b.age_days ?? 0));

  return (
    <div>
      <PageHeader
        title={protocol?.name ?? 'Protocol'}
        description={
          protocol
            ? `${protocol.country_code ?? '—'} · ${prettyProduction(String(protocol.production_type))} · ${items.length} item${items.length === 1 ? '' : 's'}`
            : 'Loading protocol...'
        }
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/reference/protocols"><ArrowLeft className="h-4 w-4" /> Back</Link>
            </Button>
            <Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> Add item</Button>
          </div>
        }
      />

      {protocol && (
        <Card>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Pair label="Country">{String(protocol.country_code ?? '—')}</Pair>
            <Pair label="Production">{prettyProduction(String(protocol.production_type))}</Pair>
            <Pair label="System">{String((protocol as Record<string, unknown>).production_system ?? 'inorganic')}</Pair>
            <Pair label="Slug"><code className="text-xs">{String(protocol.slug)}</code></Pair>
            <Pair label="Default">{(protocol as Record<string, unknown>).is_default ? <Badge tone="info">Yes</Badge> : '—'}</Pair>
            <Pair label="Active">{(protocol as Record<string, unknown>).is_active ? <Badge tone="success">Yes</Badge> : <Badge tone="muted">No</Badge>}</Pair>
          </dl>
          {(protocol as Record<string, unknown>).source !== undefined && (
            <p className="mt-3 text-xs text-[var(--color-brand-muted)]">
              <strong>Source:</strong> {String((protocol as Record<string, unknown>).source ?? '—')}
            </p>
          )}
          {(protocol as Record<string, unknown>).notes ? (
            <p className="mt-2 text-sm text-[var(--color-brand-fg)]">{String((protocol as Record<string, unknown>).notes)}</p>
          ) : null}
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="mb-3 text-base font-semibold">Schedule</h2>
        {detail.isLoading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Syringe} title="No items in this protocol yet" description="Add vaccines or treatments to build out the schedule." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Day</TH>
                <TH>Kind</TH>
                <TH>Disease / target</TH>
                <TH>Name</TH>
                <TH>Strain</TH>
                <TH>Method</TH>
                <TH>Dose</TH>
                <TH>Critical</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-mono text-sm">D{it.age_days}{it.window_days && it.window_days > 0 ? ` ±${it.window_days}` : ''}</TD>
                  <TD>
                    <Badge tone={it.kind === 'vaccine' ? 'info' : 'muted'}>
                      {it.kind === 'vaccine' ? <Syringe className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
                      {it.kind}
                    </Badge>
                  </TD>
                  <TD className="text-sm">{it.disease_target}</TD>
                  <TD className="font-medium">{it.name}</TD>
                  <TD className="text-sm text-[var(--color-brand-muted)]">{it.vaccine_strain ?? '—'}</TD>
                  <TD className="text-sm">{prettyMethod(it.method)}</TD>
                  <TD className="text-sm text-[var(--color-brand-muted)]">{it.dosage ?? '—'}</TD>
                  <TD>{it.critical ? <Badge tone="danger"><AlertTriangle className="h-3 w-3" /> Critical</Badge> : '—'}</TD>
                  <TD className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(it)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(it)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add schedule item</DialogTitle>
            <DialogDescription>Vaccines and treatments anchored on day-of-age from placement.</DialogDescription>
          </DialogHeader>
          <ItemForm
            protocolId={id}
            onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['protocol', id] }); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit schedule item</DialogTitle>
          </DialogHeader>
          {editing && (
            <ItemForm
              protocolId={id}
              initial={editing}
              onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['protocol', id] }); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this item?</DialogTitle>
            <DialogDescription>
              {deleting?.name} at day {deleting?.age_days}. Existing flock schedules already created from
              this protocol stay untouched — only the template is changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button variant="danger" onClick={() => deleting?.id && del.mutate(deleting.id)} disabled={del.isPending}>
              {del.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function prettyMethod(m?: string): string {
  return METHODS.find((x) => x.value === m)?.label ?? m ?? '—';
}

function prettyProduction(p?: string): string {
  if (!p) return '—';
  return p.replace('_', '-').replace(/^\w/, (c) => c.toUpperCase());
}

function ItemForm({
  protocolId,
  initial,
  onDone,
}: {
  protocolId: string;
  initial?: Item;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<'vaccine' | 'treatment'>(initial?.kind ?? 'vaccine');
  const [diseaseTarget, setDiseaseTarget] = useState(initial?.disease_target ?? 'newcastle');
  const [name, setName] = useState(initial?.name ?? '');
  const [strain, setStrain] = useState(initial?.vaccine_strain ?? '');
  const [method, setMethod] = useState<ItemMethod>(initial?.method ?? 'drinking_water');
  const [ageDays, setAgeDays] = useState<number | ''>(initial?.age_days ?? '');
  const [windowDays, setWindowDays] = useState<number | ''>(initial?.window_days ?? 2);
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [critical, setCritical] = useState(initial?.critical ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [altNames, setAltNames] = useState((initial?.alt_names ?? []).join(', '));

  const m = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        kind,
        disease_target: diseaseTarget,
        name,
        vaccine_strain: strain || null,
        method,
        age_days: Number(ageDays),
        window_days: windowDays === '' ? 2 : Number(windowDays),
        dosage: dosage || null,
        critical,
        notes: notes || null,
        alt_names: altNames
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      };
      return initial?.id
        ? endpoints.updateProtocolItem(protocolId, initial.id, payload)
        : endpoints.createProtocolItem(protocolId, payload);
    },
    onSuccess: () => {
      toast.success(initial ? 'Item updated.' : 'Item added.');
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Kind</Label>
          <select value={kind} onChange={(e) => setKind(e.target.value as 'vaccine' | 'treatment')} className={selectClass}>
            <option value="vaccine">Vaccine</option>
            <option value="treatment">Treatment</option>
          </select>
        </div>
        <div>
          <Label>Disease / target</Label>
          <select value={diseaseTarget} onChange={(e) => setDiseaseTarget(e.target.value)} className={selectClass}>
            {DISEASE_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label>Method</Label>
          <select value={method} onChange={(e) => setMethod(e.target.value as ItemMethod)} className={selectClass}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Newcastle (Lasota)" required /></div>
        <div><Label>Strain</Label><Input value={strain ?? ''} onChange={(e) => setStrain(e.target.value)} placeholder="Lasota / HB1" /></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div><Label>Day of age *</Label><Input type="number" min={0} max={1000} value={ageDays} onChange={(e) => setAgeDays(e.target.value === '' ? '' : Number(e.target.value))} required /></div>
        <div><Label>Window ± days</Label><Input type="number" min={0} max={30} value={windowDays} onChange={(e) => setWindowDays(e.target.value === '' ? '' : Number(e.target.value))} /></div>
        <div><Label>Dosage</Label><Input value={dosage ?? ''} onChange={(e) => setDosage(e.target.value)} placeholder="1 drop / bird" /></div>
      </div>

      <div>
        <Label>Alternative names (comma-separated)</Label>
        <Input value={altNames} onChange={(e) => setAltNames(e.target.value)} placeholder="NDV Lasota, Newcastle B1" />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={notes ?? ''} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px]" />
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
        Critical — flock loss risk if missed
      </label>

      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={m.isPending}>
          {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {initial ? 'Save changes' : 'Add item'}
        </Button>
      </DialogFooter>
    </form>
  );
}

const selectClass =
  'h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm';
