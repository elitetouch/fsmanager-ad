'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bird, Loader2, PlusCircle, Search } from 'lucide-react';
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
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtInt } from '@/lib/format';
import type { BreedRow } from '@/lib/api';

export default function BreedsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [production, setProduction] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<BreedRow | null>(null);
  const [creating, setCreating] = useState(false);
  const perPage = 50;

  const list = useQuery({
    queryKey: ['breeds', { q, production, page }],
    queryFn: () => endpoints.listBreeds({
      q: q || undefined,
      production_type: production || undefined,
      page,
      per_page: perPage,
    }),
    placeholderData: (prev) => prev,
  });

  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteBreed(id),
    onSuccess: () => { toast.success('Breed deactivated.'); qc.invalidateQueries({ queryKey: ['breeds'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Breeds"
        description="Global breed catalogue. Edits propagate immediately to every farm using this breed."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusCircle className="h-4 w-4" /> New breed
          </Button>
        }
      />

      <Card className="mb-4">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or slug…" className="pl-9" />
          </div>
          <select
            value={production}
            onChange={(e) => { setProduction(e.target.value); setPage(1); }}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any production type</option>
            <option value="broiler">Broiler</option>
            <option value="layer">Layer</option>
            <option value="dual_purpose">Dual purpose</option>
          </select>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {list.isLoading && !list.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : list.data?.breeds.length === 0 ? (
        <EmptyState icon={Bird} title="No breeds match" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Slug</TH>
                <TH>Production</TH>
                <TH>Country</TH>
                <TH>Market age (d)</TH>
                <TH>Active</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {list.data?.breeds.map((b) => (
                <TR key={b.id}>
                  <TD className="font-medium">{b.name}</TD>
                  <TD className="font-mono text-xs text-[var(--color-brand-muted)]">{b.slug}</TD>
                  <TD className="capitalize">{b.production_type.replace('_', ' ')}</TD>
                  <TD>{b.country_of_origin ?? '—'}</TD>
                  <TD>{fmtInt(b.typical_market_age_days ?? null)}</TD>
                  <TD>{b.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</TD>
                  <TD className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>Edit</Button>
                      {b.is_active && (
                        <Button variant="ghost" size="sm" onClick={() => del.mutate(b.id)}>Deactivate</Button>
                      )}
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

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>New breed</DialogTitle>
            <DialogDescription>Slug auto-derived from name when blank.</DialogDescription>
          </DialogHeader>
          <BreedForm
            onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['breeds'] }); }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Edit breed</DialogTitle>
            <DialogDescription>Changes are audit-logged.</DialogDescription>
          </DialogHeader>
          {editing && (
            <BreedForm
              initial={editing}
              onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['breeds'] }); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BreedForm({ initial, onDone }: { initial?: BreedRow; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [productionType, setProductionType] = useState<BreedRow['production_type']>(initial?.production_type ?? 'broiler');
  const [breeder, setBreeder] = useState(initial?.breeder_company ?? '');
  const [country, setCountry] = useState(initial?.country_of_origin ?? '');
  const [marketAge, setMarketAge] = useState<number | ''>(initial?.typical_market_age_days ?? '');
  const [matureWeight, setMatureWeight] = useState<number | ''>(initial?.typical_mature_weight_g ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const m = useMutation({
    mutationFn: () => {
      const payload: Partial<BreedRow> = {
        name,
        slug: slug || undefined,
        production_type: productionType,
        breeder_company: breeder || null,
        country_of_origin: country || null,
        typical_market_age_days: marketAge === '' ? null : Number(marketAge),
        typical_mature_weight_g: matureWeight === '' ? null : Number(matureWeight),
        description: description || null,
        is_active: isActive,
      };
      return initial ? endpoints.updateBreed(initial.id, payload) : endpoints.createBreed(payload);
    },
    onSuccess: () => { toast.success(initial ? 'Breed updated.' : 'Breed created.'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 sm:grid-cols-2">
      <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Slug (auto if blank)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-xs" /></div>
      <div>
        <Label>Production type *</Label>
        <select value={productionType} onChange={(e) => setProductionType(e.target.value as BreedRow['production_type'])}
          className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm">
          <option value="broiler">Broiler</option>
          <option value="layer">Layer</option>
          <option value="dual_purpose">Dual purpose</option>
        </select>
      </div>
      <div><Label>Breeder company</Label><Input value={breeder} onChange={(e) => setBreeder(e.target.value)} /></div>
      <div><Label>Country of origin</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. NL, US" /></div>
      <div><Label>Market age (days)</Label><Input type="number" min={1} value={marketAge} onChange={(e) => setMarketAge(e.target.value === '' ? '' : Number(e.target.value))} /></div>
      <div><Label>Mature weight (g)</Label><Input type="number" min={1} value={matureWeight} onChange={(e) => setMatureWeight(e.target.value === '' ? '' : Number(e.target.value))} /></div>
      <div className="flex items-end"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label></div>
      <div className="sm:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <DialogFooter className="sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
      </DialogFooter>
    </form>
  );
}
