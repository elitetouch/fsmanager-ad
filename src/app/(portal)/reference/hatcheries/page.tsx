'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Loader2, PlusCircle, Search } from 'lucide-react';
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
import type { HatcheryRow } from '@/lib/api';

export default function HatcheriesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<HatcheryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const perPage = 50;

  const list = useQuery({
    queryKey: ['hatcheries', { q, country, page }],
    queryFn: () => endpoints.listHatcheries({
      q: q || undefined,
      country: country || undefined,
      page,
      per_page: perPage,
    }),
    placeholderData: (prev) => prev,
  });

  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteHatchery(id),
    onSuccess: () => { toast.success('Hatchery deactivated.'); qc.invalidateQueries({ queryKey: ['hatcheries'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Hatcheries"
        description="Per-country hatchery directory shown to farmers when placing a flock."
        actions={<Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> New hatchery</Button>}
      />

      <Card className="mb-4">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or slug…" className="pl-9" />
          </div>
          <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="Country (e.g. NG)" className="sm:w-32" />
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {list.isLoading && !list.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : list.data?.hatcheries.length === 0 ? (
        <EmptyState icon={BookOpen} title="No hatcheries match" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Country</TH>
                <TH>Region</TH>
                <TH>Contact</TH>
                <TH>Active</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {list.data?.hatcheries.map((h) => (
                <TR key={h.id}>
                  <TD className="font-medium">{h.name}</TD>
                  <TD>{h.country}</TD>
                  <TD>{h.region ?? '—'}</TD>
                  <TD className="text-xs text-[var(--color-brand-muted)]">{h.contact_email ?? h.contact_phone ?? '—'}</TD>
                  <TD>{h.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</TD>
                  <TD className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(h)}>Edit</Button>
                      {h.is_active && <Button variant="ghost" size="sm" onClick={() => del.mutate(h.id)}>Deactivate</Button>}
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
            <DialogTitle>New hatchery</DialogTitle>
            <DialogDescription>Country must be ISO-3166 alpha-2.</DialogDescription>
          </DialogHeader>
          <HatcheryForm onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['hatcheries'] }); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Edit hatchery</DialogTitle>
            <DialogDescription>Changes are audit-logged.</DialogDescription>
          </DialogHeader>
          {editing && (
            <HatcheryForm initial={editing} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['hatcheries'] }); }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HatcheryForm({ initial, onDone }: { initial?: HatcheryRow; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [region, setRegion] = useState(initial?.region ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [phone, setPhone] = useState(initial?.contact_phone ?? '');
  const [email, setEmail] = useState(initial?.contact_email ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const m = useMutation({
    mutationFn: () => {
      const payload: Partial<HatcheryRow> = {
        name, slug: slug || undefined,
        country: country.toUpperCase(),
        region: region || null, city: city || null,
        contact_phone: phone || null, contact_email: email || null,
        website: website || null, notes: notes || null,
        is_active: isActive,
      };
      return initial ? endpoints.updateHatchery(initial.id, payload) : endpoints.createHatchery(payload);
    },
    onSuccess: () => { toast.success(initial ? 'Hatchery updated.' : 'Hatchery created.'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Slug (auto if blank)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-xs" /></div>
      <div><Label>Country (ISO-2) *</Label><Input value={country} maxLength={2} onChange={(e) => setCountry(e.target.value.toUpperCase())} required /></div>
      <div><Label>Region</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} /></div>
      <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
      <div><Label>Contact phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div><Label>Contact email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="sm:col-span-2"><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
      <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="flex items-end sm:col-span-2"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label></div>
      <DialogFooter className="sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
      </DialogFooter>
    </form>
  );
}
