'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, MessageSquareText, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

export default function TemplatesPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => endpoints.listEmailTemplates(),
  });

  const create = useMutation({
    mutationFn: (payload: { name: string; subject: string; preheader?: string }) =>
      endpoints.createEmailTemplate({ ...payload, blocks: [] }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template created.');
      router.push(`/marketing/templates/${r.template.id}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.deleteEmailTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template removed.');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const templates = list.data?.templates ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Email templates"
        description="Reusable block-based designs. Every campaign starts from one of these."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New template
          </Button>
        }
      />

      {list.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquareText}
            title="No templates yet"
            description="Create your first block-based template — heading, paragraph, image, button, and more."
            action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New template</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col p-4 transition hover:shadow-md">
              <Link href={`/marketing/templates/${t.id}`} className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-sm font-bold text-[var(--color-brand-fg)]">{t.name}</h3>
                  <Badge className="bg-[var(--color-brand-accent)] text-[var(--color-brand-primary-deep)]">
                    {t.blockCount} blocks
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-[var(--color-brand-muted)]">
                  <span className="font-semibold">Subject:</span> {t.subject}
                </p>
                {t.preheader && (
                  <p className="line-clamp-1 text-xs text-[var(--color-brand-muted)]">
                    <span className="font-semibold">Preview:</span> {t.preheader}
                  </p>
                )}
              </Link>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--color-brand-border)] pt-3 text-[11px] text-[var(--color-brand-muted)]">
                <span>Updated {t.updatedAt ? fmtDateTime(t.updatedAt) : 'never'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    if (confirm(`Delete "${t.name}"? Campaigns already sent are unaffected.`)) {
                      remove.mutate(t.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(v) => create.mutate(v)}
        pending={create.isPending}
      />
    </div>
  );
}

function CreateDialog({
  open, onClose, onSubmit, pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: { name: string; subject: string; preheader?: string }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create email template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Template name (internal)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Signup nudge · v1" />
          </div>
          <div>
            <Label htmlFor="subject">Subject line</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="See what's happening on your farm — free." />
          </div>
          <div>
            <Label htmlFor="preheader">Preview text (optional)</Label>
            <Input id="preheader" value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Track feed conversion, mortality, and cost in one place." />
            <p className="mt-1 text-xs text-[var(--color-brand-muted)]">
              Shown next to the subject line in the inbox. Keep under 90 characters.
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button
            disabled={!name.trim() || !subject.trim() || pending}
            onClick={() => onSubmit({ name: name.trim(), subject: subject.trim(), preheader: preheader.trim() || undefined })}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create &amp; open editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
