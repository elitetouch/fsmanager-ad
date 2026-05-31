'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Search, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import type { ProtocolRow } from '@/lib/api';

export default function ProtocolsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [production, setProduction] = useState('');
  const [system, setSystem] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ProtocolRow | null>(null);
  const [creating, setCreating] = useState(false);
  const perPage = 50;

  const list = useQuery({
    queryKey: ['protocols', { q, country, production, system, page }],
    queryFn: () => endpoints.listProtocols({
      q: q || undefined,
      country_code: country || undefined,
      production_type: production || undefined,
      production_system: system || undefined,
      page,
      per_page: perPage,
    }),
    placeholderData: (prev) => prev,
  });

  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteProtocol(id),
    onSuccess: () => { toast.success('Protocol deactivated.'); qc.invalidateQueries({ queryKey: ['protocols'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Vaccination protocols"
        description="Country + production-system protocol headers. Per-item schedule editing is a planned sprint."
        actions={<Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> New protocol</Button>}
      />

      <Card className="mb-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
          <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="Country" className="sm:w-28" />
          <select value={production} onChange={(e) => { setProduction(e.target.value); setPage(1); }}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm">
            <option value="">Any production</option>
            <option value="broiler">Broiler</option>
            <option value="layer">Layer</option>
            <option value="dual_purpose">Dual purpose</option>
          </select>
          <select value={system} onChange={(e) => { setSystem(e.target.value); setPage(1); }}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm">
            <option value="">Any system</option>
            <option value="inorganic">Inorganic</option>
            <option value="organic">Organic</option>
          </select>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {list.isLoading && !list.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : list.data?.protocols.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No protocols match" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Country</TH>
                <TH>Production</TH>
                <TH>System</TH>
                <TH>Active</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {list.data?.protocols.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD>{p.country_code}</TD>
                  <TD className="capitalize">{p.production_type.replace('_', ' ')}</TD>
                  <TD className="capitalize">{p.production_system ?? '—'}</TD>
                  <TD>{p.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</TD>
                  <TD className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>Edit</Button>
                      {p.is_active && <Button variant="ghost" size="sm" onClick={() => del.mutate(p.id)}>Deactivate</Button>}
                    </div>
                  </TD>
                </TR>
              ))}
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
        <DialogContent className="w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>New protocol</DialogTitle>
            <DialogDescription>Header only — vaccination items are edited per-protocol.</DialogDescription>
          </DialogHeader>
          <ProtocolForm onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['protocols'] }); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Edit protocol</DialogTitle>
            <DialogDescription>Audit-logged.</DialogDescription>
          </DialogHeader>
          {editing && <ProtocolForm initial={editing} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['protocols'] }); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProtocolForm({ initial, onDone }: { initial?: ProtocolRow; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [country, setCountry] = useState(initial?.country_code ?? '');
  const [productionType, setProductionType] = useState<ProtocolRow['production_type']>(initial?.production_type ?? 'broiler');
  const [system, setSystem] = useState<NonNullable<ProtocolRow['production_system']>>(initial?.production_system ?? 'inorganic');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const m = useMutation({
    mutationFn: () => {
      const payload: Partial<ProtocolRow> = {
        name, slug: slug || undefined,
        country_code: country.toUpperCase(),
        production_type: productionType,
        production_system: system,
        description: description || null,
        is_active: isActive,
      };
      return initial ? endpoints.updateProtocol(initial.id, payload) : endpoints.createProtocol(payload);
    },
    onSuccess: () => { toast.success(initial ? 'Protocol updated.' : 'Protocol created.'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Slug (auto)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-xs" /></div>
      <div><Label>Country (ISO-2) *</Label><Input value={country} maxLength={2} onChange={(e) => setCountry(e.target.value.toUpperCase())} required /></div>
      <div>
        <Label>Production *</Label>
        <select value={productionType} onChange={(e) => setProductionType(e.target.value as ProtocolRow['production_type'])}
          className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm">
          <option value="broiler">Broiler</option>
          <option value="layer">Layer</option>
          <option value="dual_purpose">Dual purpose</option>
        </select>
      </div>
      <div>
        <Label>System</Label>
        <select value={system} onChange={(e) => setSystem(e.target.value as 'inorganic' | 'organic')}
          className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm">
          <option value="inorganic">Inorganic</option>
          <option value="organic">Organic</option>
        </select>
      </div>
      <div className="sm:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="sm:col-span-2"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label></div>
      <DialogFooter className="sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
      </DialogFooter>
    </form>
  );
}
