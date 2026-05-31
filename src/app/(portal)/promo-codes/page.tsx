'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDate, fmtInt } from '@/lib/format';

export default function PromoCodesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const perPage = 50;

  const list = useQuery({
    queryKey: ['promo-codes', { page }],
    queryFn: () => endpoints.listPromoCodes({ page, per_page: perPage }),
  });

  return (
    <div>
      <PageHeader
        title="Promo codes"
        description="Generate codes that grant tokens on redemption — for growth, partnerships, ad campaigns."
        actions={<Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> New code</Button>}
      />

      {list.isLoading && !list.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : list.data?.codes.length === 0 ? (
        <EmptyState icon={Sparkles} title="No codes yet" />
      ) : (
        <>
          <Table>
            <THead><TR><TH>Code</TH><TH>Label</TH><TH>Tokens</TH><TH>Redemptions</TH><TH>Expires</TH><TH>Status</TH></TR></THead>
            <TBody>
              {list.data?.codes.map((row) => {
                const c = row as Record<string, unknown>;
                return (
                  <TR key={String(c.id)}>
                    <TD><code className="font-mono text-sm font-bold">{String(c.code)}</code></TD>
                    <TD>{(c.label as string | null) ?? '—'}</TD>
                    <TD>{fmtInt(Number(c.quantity_per_redemption))} · {String(c.token_type)}/{String(c.tier)}</TD>
                    <TD>{fmtInt(Number(c.redemptions_count))} / {c.max_redemptions != null ? fmtInt(Number(c.max_redemptions)) : '∞'}</TD>
                    <TD className="text-[var(--color-brand-muted)]">{c.expires_at ? fmtDate(String(c.expires_at)) : 'No expiry'}</TD>
                    <TD>{c.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          {list.data?.meta && <Pagination page={list.data.meta.currentPage} lastPage={list.data.meta.lastPage} total={list.data.meta.total} perPage={list.data.meta.perPage} onChange={setPage} />}
        </>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New promo code</DialogTitle><DialogDescription>Code auto-generated if left blank.</DialogDescription></DialogHeader>
          <PromoForm onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['promo-codes'] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromoForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [tokenType, setTokenType] = useState<'broiler' | 'layer'>('broiler');
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [maxRedemptions, setMaxRedemptions] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState('');

  const m = useMutation({
    mutationFn: () => endpoints.createPromoCode({
      code: code || undefined,
      label: label || undefined,
      token_type: tokenType,
      tier,
      quantity_per_redemption: Number(quantity),
      max_redemptions: maxRedemptions === '' ? undefined : Number(maxRedemptions),
      expires_at: expiresAt || undefined,
    }),
    onSuccess: () => { toast.success('Promo code created.'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Code (auto if blank)</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="FARMSUMMER25" className="font-mono" /></div>
      <div className="sm:col-span-2"><Label>Label / campaign name</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Summer 2026 launch" /></div>
      <div><Label>Token type *</Label><select value={tokenType} onChange={(e) => setTokenType(e.target.value as 'broiler' | 'layer')} className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"><option value="broiler">Broiler</option><option value="layer">Layer</option></select></div>
      <div><Label>Tier *</Label><select value={tier} onChange={(e) => setTier(e.target.value as 'basic' | 'premium')} className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"><option value="basic">Basic</option><option value="premium">Premium</option></select></div>
      <div><Label>Tokens per redemption *</Label><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} required /></div>
      <div><Label>Max redemptions (∞ if blank)</Label><Input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value === '' ? '' : Number(e.target.value))} /></div>
      <div className="sm:col-span-2"><Label>Expires at</Label><Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
      <DialogFooter className="sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create</Button>
      </DialogFooter>
    </form>
  );
}
