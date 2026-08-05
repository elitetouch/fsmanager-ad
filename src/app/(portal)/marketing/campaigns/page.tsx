'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Megaphone, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';
import type { AudienceFilter, CampaignStatus } from '@/types/api';

const STATUS_TONE: Record<CampaignStatus, string> = {
  draft:     'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-800',
  sending:   'bg-amber-100 text-amber-800',
  sent:      'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-neutral-100 text-neutral-700',
  failed:    'bg-rose-100 text-rose-800',
};

export default function CampaignsPage() {
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => endpoints.listEmailCampaigns(),
  });

  const campaigns = list.data?.campaigns ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Email campaigns"
        description="Pick a template, choose an audience, hit send. Live delivery stats update as jobs run."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        }
      />

      {list.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Draft your first campaign — you'll pick a template, choose which prospects it goes to, and send when ready."
            action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New campaign</Button>}
          />
        </Card>
      ) : (
        <Card className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Template</TH>
                <TH>Status</TH>
                <TH className="text-right">Recipients</TH>
                <TH className="text-right">Sent</TH>
                <TH className="text-right">Open rate</TH>
                <TH className="text-right">Click rate</TH>
                <TH>Updated</TH>
              </TR>
            </THead>
            <TBody>
              {campaigns.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/marketing/campaigns/${c.id}`} className="font-medium text-[var(--color-brand-primary-deep)] hover:underline">
                      {c.name}
                    </Link>
                  </TD>
                  <TD className="text-[var(--color-brand-muted)]">{c.templateName}</TD>
                  <TD><Badge className={STATUS_TONE[c.status]}>{c.status}</Badge></TD>
                  <TD className="text-right">{fmtInt(c.stats.recipients)}</TD>
                  <TD className="text-right">{fmtInt(c.stats.sent)}</TD>
                  <TD className="text-right">{c.stats.openRate !== null ? `${(c.stats.openRate * 100).toFixed(1)}%` : '—'}</TD>
                  <TD className="text-right">{c.stats.clickRate !== null ? `${(c.stats.clickRate * 100).toFixed(1)}%` : '—'}</TD>
                  <TD className="text-xs text-[var(--color-brand-muted)]">
                    {c.updatedAt ? fmtDateTime(c.updatedAt) : '—'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <CreateDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

/* ─────────────────────────── create dialog ─────────────────────────── */

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [audienceSource, setAudienceSource] = useState<'prospects' | 'users' | 'both'>('prospects');
  const [excludeUnsub, setExcludeUnsub] = useState(true);
  const [excludeRegistered, setExcludeRegistered] = useState(true);
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  const templates = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => endpoints.listEmailTemplates(),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => {
      const audience: AudienceFilter = {
        source: audienceSource,
        exclude_unsubscribed: excludeUnsub,
        exclude_registered: excludeRegistered,
      };
      return endpoints.createEmailCampaign({
        name: name.trim(),
        template_id: templateId,
        audience_filter: audience,
        from_email: fromEmail.trim() || null,
        from_name: fromName.trim() || null,
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campaign draft created.');
      router.push(`/marketing/campaigns/${r.campaign.id}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Signup nudge · March batch" />
          </div>
          <div>
            <Label htmlFor="tpl">Template</Label>
            <select
              id="tpl"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--color-brand-input-border)] bg-white px-3 text-sm"
              disabled={templates.isLoading}
            >
              <option value="">— pick a template —</option>
              {templates.data?.templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Audience source</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['prospects', 'users', 'both'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAudienceSource(s)}
                  disabled={s !== 'prospects'}
                  title={s !== 'prospects' ? 'Sending to registered users requires product sign-off — coming soon' : undefined}
                  className={`rounded-lg border-2 p-2 text-xs font-semibold capitalize transition ${
                    audienceSource === s
                      ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-accent)]/40 text-[var(--color-brand-fg)]'
                      : 'border-[var(--color-brand-border)] text-[var(--color-brand-muted)]'
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs text-[var(--color-brand-fg)]">
              <input type="checkbox" checked={excludeUnsub} onChange={(e) => setExcludeUnsub(e.target.checked)} />
              Exclude prospects who have unsubscribed
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--color-brand-fg)]">
              <input type="checkbox" checked={excludeRegistered} onChange={(e) => setExcludeRegistered(e.target.checked)} />
              Exclude prospects who have already registered (recommended)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from-email">From email (optional)</Label>
              <Input id="from-email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="marketing@fsinnovation.net" />
            </div>
            <div>
              <Label htmlFor="from-name">From name (optional)</Label>
              <Input id="from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="FSI Team" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button disabled={!name.trim() || !templateId || create.isPending} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
