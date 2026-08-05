'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, X, Loader2, Users, Mail, MailCheck, MailOpen, MousePointerClick,
  MailX, MailWarning, AlertOctagon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';
import type { CampaignStatus } from '@/types/api';

const STATUS_TONE: Record<CampaignStatus, string> = {
  draft:     'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-800',
  sending:   'bg-amber-100 text-amber-800',
  sent:      'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-neutral-100 text-neutral-700',
  failed:    'bg-rose-100 text-rose-800',
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  // Poll every 5s while sending so live stats update without a refresh.
  const detail = useQuery({
    queryKey: ['email-campaign', id],
    queryFn: () => endpoints.getEmailCampaign(id),
    refetchInterval: (q) => {
      const c = q.state.data?.campaign;
      return c && c.status === 'sending' ? 5000 : false;
    },
  });

  const send = useMutation({
    mutationFn: () => endpoints.sendEmailCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaign', id] });
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campaign queued for sending.');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: () => endpoints.cancelEmailCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaign', id] });
      toast.success('Campaign cancelled.');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (detail.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!detail.data) return <p className="text-sm text-rose-700">Campaign not found.</p>;

  const c = detail.data.campaign;
  const s = c.stats;

  const canSend = c.status === 'draft' || c.status === 'scheduled';
  const canCancel = c.status === 'scheduled' || c.status === 'sending';

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/marketing/campaigns" className="text-[var(--color-brand-muted)] hover:text-[var(--color-brand-fg)]">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span>{c.name}</span>
            <Badge className={STATUS_TONE[c.status]}>{c.status}</Badge>
          </span>
        }
        description={
          <>
            Template: <Link href={`/marketing/templates/${c.templateId}`} className="text-[var(--color-brand-primary-deep)] hover:underline">{c.templateName}</Link>
            {' · '}Subject: <span className="italic">{c.templateSubject}</span>
          </>
        }
        actions={
          <div className="flex gap-2">
            {canCancel && (
              <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Cancel campaign
              </Button>
            )}
            {canSend && (
              <Button
                onClick={() => {
                  if (confirm(`Send this campaign now? Emails will queue for delivery.`)) {
                    send.mutate();
                  }
                }}
                disabled={send.isPending}
              >
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send now
              </Button>
            )}
          </div>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users}  label="Recipients"   value={fmtInt(s.recipients)} />
        <Stat icon={Mail}   label="Sent"         value={fmtInt(s.sent)} />
        <Stat icon={MailCheck} label="Delivered" value={fmtInt(s.delivered)} tone="emerald" />
        <Stat icon={MailOpen}  label="Opened"    value={fmtInt(s.opened)} tone="emerald" sub={s.openRate !== null ? `${(s.openRate * 100).toFixed(1)}%` : ''} />
        <Stat icon={MousePointerClick} label="Clicked" value={fmtInt(s.clicked)} tone="emerald" sub={s.clickRate !== null ? `${(s.clickRate * 100).toFixed(1)}%` : ''} />
        <Stat icon={MailX}       label="Bounced"      value={fmtInt(s.bounced)}      tone="rose" />
        <Stat icon={MailWarning} label="Unsubscribed" value={fmtInt(s.unsubscribed)} tone="amber" />
        <Stat icon={AlertOctagon} label="Failed"      value={fmtInt(s.failed)}       tone="rose" />
      </div>

      {/* Meta */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-[var(--color-brand-fg)]">Configuration</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <MetaRow label="From">{c.fromName ?? '—'} &lt;{c.fromEmail ?? 'default sender'}&gt;</MetaRow>
          <MetaRow label="Reply-to">{c.replyTo ?? '—'}</MetaRow>
          <MetaRow label="Scheduled for">{c.scheduledFor ? fmtDateTime(c.scheduledFor) : 'send immediately'}</MetaRow>
          <MetaRow label="Started">{c.startedAt ? fmtDateTime(c.startedAt) : '—'}</MetaRow>
          <MetaRow label="Completed">{c.completedAt ? fmtDateTime(c.completedAt) : '—'}</MetaRow>
          <MetaRow label="Audience source">{c.audienceFilter.source}</MetaRow>
          <MetaRow label="Exclude unsubscribed">{String(c.audienceFilter.exclude_unsubscribed ?? true)}</MetaRow>
          <MetaRow label="Exclude registered">{String(c.audienceFilter.exclude_registered ?? true)}</MetaRow>
        </dl>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: 'emerald' | 'rose' | 'amber';
}) {
  const bg =
    tone === 'emerald' ? 'bg-emerald-50 text-emerald-800' :
    tone === 'rose'    ? 'bg-rose-50 text-rose-800' :
    tone === 'amber'   ? 'bg-amber-50 text-amber-800' :
                         'bg-slate-50 text-slate-800';
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand-muted)]">{label}</p>
        <p className="text-lg font-bold text-[var(--color-brand-fg)]">
          {value} {sub && <span className="ml-1 text-xs text-[var(--color-brand-muted)]">{sub}</span>}
        </p>
      </div>
    </Card>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--color-brand-border)] py-1.5 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brand-muted)]">{label}</dt>
      <dd className="text-[var(--color-brand-fg)]">{children}</dd>
    </div>
  );
}
