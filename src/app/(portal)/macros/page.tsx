'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Zap } from 'lucide-react';
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

type Macro = { id?: string; shortcut?: string; title?: string; body?: string; is_active?: boolean };

export default function MacrosPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Macro | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({ queryKey: ['macros'], queryFn: () => endpoints.listMacros() });
  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteMacro(id),
    onSuccess: () => { toast.success('Macro deleted.'); qc.invalidateQueries({ queryKey: ['macros'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Canned responses"
        description="Type `/shortcut` in a support thread compose box to expand. Saves 70% of reply time."
        actions={<Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> New macro</Button>}
      />
      {list.isLoading ? (
        <Card>{[...Array(5)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : list.data?.macros.length === 0 ? (
        <EmptyState icon={Zap} title="No macros yet" />
      ) : (
        <Table>
          <THead><TR><TH>Shortcut</TH><TH>Title</TH><TH>Preview</TH><TH>Active</TH><TH></TH></TR></THead>
          <TBody>
            {list.data?.macros.map((row) => {
              const m = row as Macro;
              return (
                <TR key={m.id}>
                  <TD><code className="rounded bg-[var(--color-brand-bg)] px-1.5 py-0.5 font-mono text-xs">/{m.shortcut}</code></TD>
                  <TD className="font-medium">{m.title}</TD>
                  <TD className="max-w-[400px] truncate text-sm text-[var(--color-brand-muted)]">{m.body}</TD>
                  <TD>{m.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</TD>
                  <TD className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => m.id && del.mutate(m.id)}>Delete</Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New macro</DialogTitle><DialogDescription>Shortcuts are case-insensitive and must be unique.</DialogDescription></DialogHeader>
          <MacroForm onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['macros'] }); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit macro</DialogTitle></DialogHeader>
          {editing && <MacroForm initial={editing} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['macros'] }); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MacroForm({ initial, onDone }: { initial?: Macro; onDone: () => void }) {
  const [shortcut, setShortcut] = useState(initial?.shortcut ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const m = useMutation({
    mutationFn: () => {
      const payload = { shortcut: shortcut.replace(/^\//, ''), title, body, is_active: isActive };
      return initial?.id ? endpoints.updateMacro(initial.id, payload) : endpoints.createMacro(payload);
    },
    onSuccess: () => { toast.success(initial ? 'Macro updated.' : 'Macro created.'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
      <div><Label>Shortcut *</Label><Input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="welcome" className="font-mono" required /></div>
      <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div><Label>Body *</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[140px]" required /></div>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
      </DialogFooter>
    </form>
  );
}
