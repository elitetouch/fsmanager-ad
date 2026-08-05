'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowUp, ArrowDown, Copy, Trash2, Save, Send, Loader2, Eye, EyeOff,
  Type as TypeIcon, Text, Image as ImageIcon, MousePointerClick, Minus, Space, Columns, Code2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import type { EmailBlock, EmailBlockType, EmailTemplate } from '@/types/api';

/* ─────────────────────────── block defaults ─────────────────────────── */

const BLOCK_META: Record<EmailBlockType, { label: string; icon: React.ComponentType<{ className?: string }>; defaults: Record<string, unknown> }> = {
  heading:   { label: 'Heading',   icon: TypeIcon,          defaults: { level: 2, text: 'Your headline', align: 'left', color: '#0A4D24' } },
  paragraph: { label: 'Paragraph', icon: Text,              defaults: { text: 'Write a paragraph of body copy. Personalize with {{ first_name }}.', align: 'left', size: '15px' } },
  image:     { label: 'Image',     icon: ImageIcon,         defaults: { src: '', alt: '', width: 520, align: 'center', href: '' } },
  button:    { label: 'Button',    icon: MousePointerClick, defaults: { label: 'Sign up free', href: 'https://app.fsinnovation.net/register', background: '#15A34A', color: '#FFFFFF', align: 'center' } },
  divider:   { label: 'Divider',   icon: Minus,             defaults: { color: '#E1E7DE', thickness: 1 } },
  spacer:    { label: 'Spacer',    icon: Space,             defaults: { height: 16 } },
  columns:   { label: '2 columns', icon: Columns,           defaults: { columns: [[], []] } },
  html:      { label: 'Raw HTML',  icon: Code2,             defaults: { html: '<!-- Your HTML here -->' } },
};

const BLOCK_ORDER: EmailBlockType[] = ['heading', 'paragraph', 'image', 'button', 'divider', 'spacer', 'columns', 'html'];

function newBlock(type: EmailBlockType): EmailBlock {
  return {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
    type,
    props: { ...BLOCK_META[type].defaults },
  };
}

/* ─────────────────────────── page ─────────────────────────── */

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['email-template', id],
    queryFn: () => endpoints.getEmailTemplate(id),
  });

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [testOpen, setTestOpen] = useState(false);

  // Load template into local state exactly once (after first fetch).
  const hydrated = useRef(false);
  useEffect(() => {
    if (query.data && !hydrated.current) {
      const t = query.data.template;
      setName(t.name);
      setSubject(t.subject);
      setPreheader(t.preheader ?? '');
      setBlocks(t.blocks ?? []);
      hydrated.current = true;
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => endpoints.updateEmailTemplate(id, { name, subject, preheader: preheader.trim() || null, blocks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-template', id] });
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setDirty(false);
      toast.success('Template saved.');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const testSend = useMutation({
    mutationFn: (to: string) => endpoints.testSendEmailTemplate(id, to),
    onSuccess: (r) => { toast.success(`Test email sent to ${r.to}.`); setTestOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const markDirty = useCallback(() => setDirty(true), []);

  const addBlock = (type: EmailBlockType) => {
    const b = newBlock(type);
    setBlocks((bs) => [...bs, b]);
    setSelectedId(b.id);
    markDirty();
  };

  const updateBlock = (bid: string, patch: Partial<EmailBlock['props']>) => {
    setBlocks((bs) => bs.map((b) => (b.id === bid ? { ...b, props: { ...b.props, ...patch } } : b)));
    markDirty();
  };

  const removeBlock = (bid: string) => {
    setBlocks((bs) => bs.filter((b) => b.id !== bid));
    if (selectedId === bid) setSelectedId(null);
    markDirty();
  };

  const duplicateBlock = (bid: string) => {
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === bid);
      if (idx < 0) return bs;
      const copy: EmailBlock = { ...bs[idx], id: newBlock(bs[idx].type).id, props: { ...bs[idx].props } };
      return [...bs.slice(0, idx + 1), copy, ...bs.slice(idx + 1)];
    });
    markDirty();
  };

  const moveBlock = (bid: string, dir: -1 | 1) => {
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === bid);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= bs.length) return bs;
      const copy = bs.slice();
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
    markDirty();
  };

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);

  if (query.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-rose-700">Couldn&apos;t load the template.</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Link href="/marketing/templates" className="text-[var(--color-brand-muted)] hover:text-[var(--color-brand-fg)]">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span>{name || 'Untitled template'}</span>
            {dirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">Unsaved</span>}
          </span>
        }
        description={`Subject: ${subject}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? <><EyeOff className="h-4 w-4" /> Hide preview</> : <><Eye className="h-4 w-4" /> Show preview</>}
            </Button>
            <Button variant="outline" onClick={() => setTestOpen(true)} disabled={dirty}>
              <Send className="h-4 w-4" /> Test send
            </Button>
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        }
      />

      <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'}`}>
        {/* LEFT — palette + template meta */}
        <Card className="p-4 space-y-4 self-start">
          <div className="space-y-2">
            <Label htmlFor="tname">Name</Label>
            <Input id="tname" value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} />
            <Label htmlFor="tsubj">Subject</Label>
            <Input id="tsubj" value={subject} onChange={(e) => { setSubject(e.target.value); markDirty(); }} />
            <Label htmlFor="tpre">Preview text</Label>
            <Input id="tpre" value={preheader} onChange={(e) => { setPreheader(e.target.value); markDirty(); }} maxLength={90} />
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand-muted)]">
              Add block
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_ORDER.map((type) => {
                const M = BLOCK_META[type];
                const Icon = M.icon;
                return (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-[var(--color-brand-border)] p-2.5 text-[11px] font-medium text-[var(--color-brand-fg)] transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-accent)]/40"
                  >
                    <Icon className="h-4 w-4 text-[var(--color-brand-primary-deep)]" />
                    {M.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-tight text-[var(--color-brand-muted)]">
              Tip: use <code>{'{{ first_name }}'}</code>, <code>{'{{ farm_name }}'}</code> in text blocks — the send job fills each recipient's values.
            </p>
          </div>
        </Card>

        {/* MIDDLE — block list */}
        <Card className="p-4">
          {blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-brand-input-border)] p-10 text-center">
              <p className="text-sm font-semibold text-[var(--color-brand-fg)]">Empty template</p>
              <p className="mt-1 text-xs text-[var(--color-brand-muted)]">Add a block from the palette on the left.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b, i) => (
                <li key={b.id}>
                  <BlockRow
                    block={b}
                    index={i}
                    total={blocks.length}
                    selected={selectedId === b.id}
                    onSelect={() => setSelectedId(b.id)}
                    onUpdate={(patch) => updateBlock(b.id, patch)}
                    onRemove={() => removeBlock(b.id)}
                    onDuplicate={() => duplicateBlock(b.id)}
                    onMove={(dir) => moveBlock(b.id, dir)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* RIGHT — live preview */}
        {showPreview && (
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-[var(--color-brand-border)] bg-[var(--color-brand-bg)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brand-muted)]">
              Live preview
            </div>
            <LivePreview id={id} dirty={dirty} />
          </Card>
        )}
      </div>

      <TestSendDialog
        open={testOpen}
        onClose={() => setTestOpen(false)}
        pending={testSend.isPending}
        onSend={(to) => testSend.mutate(to)}
      />
    </div>
  );
}

/* ─────────────────────────── block row + editor ─────────────────────────── */

function BlockRow({
  block, index, total, selected, onSelect, onUpdate, onRemove, onDuplicate, onMove,
}: {
  block: EmailBlock;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<EmailBlock['props']>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const M = BLOCK_META[block.type];
  const Icon = M.icon;

  return (
    <div
      className={`rounded-lg border-2 transition ${
        selected
          ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-accent)]/30'
          : 'border-[var(--color-brand-border)] hover:border-[var(--color-brand-input-border)]'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-fg)]">
          <Icon className="h-4 w-4 text-[var(--color-brand-primary-deep)]" />
          {M.label}
          <span className="rounded bg-[var(--color-brand-bg)] px-1.5 py-0.5 text-[10px] text-[var(--color-brand-muted)]">
            #{index + 1}
          </span>
        </span>
        <span className="flex items-center gap-0.5">
          <IconBtn label="Move up" disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMove(-1); }}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Move down" disabled={index === total - 1} onClick={(e) => { e.stopPropagation(); onMove(1); }}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}><Copy className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Delete" tone="danger" onClick={(e) => { e.stopPropagation(); onRemove(); }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
        </span>
      </button>
      {selected && (
        <div className="border-t border-[var(--color-brand-border)] bg-white p-3">
          <BlockEditor block={block} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, disabled, label, tone }: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  label: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : tone === 'danger'
            ? 'text-rose-600 hover:bg-rose-50'
            : 'text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)] hover:text-[var(--color-brand-fg)]'
      }`}
    >
      {children}
    </button>
  );
}

function BlockEditor({ block, onUpdate }: { block: EmailBlock; onUpdate: (patch: Partial<EmailBlock['props']>) => void }) {
  const p = block.props;

  switch (block.type) {
    case 'heading':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Text" full>
            <Input value={str(p.text)} onChange={(e) => onUpdate({ text: e.target.value })} />
          </Field>
          <Field label="Level">
            <select value={num(p.level, 2)} onChange={(e) => onUpdate({ level: Number(e.target.value) })} className="h-10 w-full rounded-md border border-[var(--color-brand-input-border)] bg-white px-3 text-sm">
              <option value={1}>H1 (largest)</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
            </select>
          </Field>
          <Field label="Align">
            <AlignSelect value={str(p.align, 'left')} onChange={(v) => onUpdate({ align: v })} />
          </Field>
          <Field label="Colour">
            <ColorInput value={str(p.color, '#0A4D24')} onChange={(v) => onUpdate({ color: v })} />
          </Field>
        </div>
      );
    case 'paragraph':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Text" full>
            <Textarea value={str(p.text)} rows={4} onChange={(e) => onUpdate({ text: e.target.value })} />
          </Field>
          <Field label="Align">
            <AlignSelect value={str(p.align, 'left')} onChange={(v) => onUpdate({ align: v })} />
          </Field>
          <Field label="Size (px)">
            <Input value={str(p.size, '15px')} onChange={(e) => onUpdate({ size: e.target.value })} placeholder="15px" />
          </Field>
        </div>
      );
    case 'image':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Image URL (https)" full>
            <Input value={str(p.src)} onChange={(e) => onUpdate({ src: e.target.value })} placeholder="https://.../hero.jpg" />
          </Field>
          <Field label="Alt text" full>
            <Input value={str(p.alt)} onChange={(e) => onUpdate({ alt: e.target.value })} placeholder="What this image shows" />
          </Field>
          <Field label="Width (px)">
            <Input type="number" value={num(p.width, 520)} onChange={(e) => onUpdate({ width: Number(e.target.value) })} />
          </Field>
          <Field label="Align">
            <AlignSelect value={str(p.align, 'center')} onChange={(v) => onUpdate({ align: v })} />
          </Field>
          <Field label="Link URL (optional)" full>
            <Input value={str(p.href)} onChange={(e) => onUpdate({ href: e.target.value })} placeholder="https://..." />
          </Field>
        </div>
      );
    case 'button':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Label">
            <Input value={str(p.label)} onChange={(e) => onUpdate({ label: e.target.value })} />
          </Field>
          <Field label="URL">
            <Input value={str(p.href)} onChange={(e) => onUpdate({ href: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Background">
            <ColorInput value={str(p.background, '#15A34A')} onChange={(v) => onUpdate({ background: v })} />
          </Field>
          <Field label="Text colour">
            <ColorInput value={str(p.color, '#FFFFFF')} onChange={(v) => onUpdate({ color: v })} />
          </Field>
          <Field label="Align">
            <AlignSelect value={str(p.align, 'center')} onChange={(v) => onUpdate({ align: v })} />
          </Field>
        </div>
      );
    case 'divider':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Colour">
            <ColorInput value={str(p.color, '#E1E7DE')} onChange={(v) => onUpdate({ color: v })} />
          </Field>
          <Field label="Thickness (px)">
            <Input type="number" min={1} max={6} value={num(p.thickness, 1)} onChange={(e) => onUpdate({ thickness: Number(e.target.value) })} />
          </Field>
        </div>
      );
    case 'spacer':
      return (
        <Field label="Height (px)">
          <Input type="number" min={4} max={80} value={num(p.height, 16)} onChange={(e) => onUpdate({ height: Number(e.target.value) })} />
        </Field>
      );
    case 'columns':
      return (
        <p className="text-xs text-[var(--color-brand-muted)]">
          2-column blocks are wrapper layouts. Nested-block editing UI ships in the next iteration — for now, edit via the raw HTML block for column contents.
        </p>
      );
    case 'html':
      return (
        <Field label="HTML" full>
          <Textarea value={str(p.html)} rows={8} onChange={(e) => onUpdate({ html: e.target.value })} className="font-mono text-xs" />
        </Field>
      );
    default:
      return null;
  }
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AlignSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-[var(--color-brand-input-border)] bg-white px-3 text-sm">
      <option value="left">Left</option>
      <option value="center">Center</option>
      <option value="right">Right</option>
    </select>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-[var(--color-brand-input-border)]" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" />
    </div>
  );
}

/* ─────────────────────────── live preview ─────────────────────────── */

function LivePreview({ id, dirty }: { id: string; dirty: boolean }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await endpoints.previewEmailTemplate(id);
        if (!cancelled) setHtml(r.html);
      } catch {
        if (!cancelled) setHtml('<p style="padding:16px;color:#c1272d;">Preview failed to load.</p>');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [id, dirty]);

  return (
    <div className="relative min-h-[520px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs text-[var(--color-brand-muted)]">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" /> refreshing preview…
        </div>
      )}
      {dirty && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          Preview shows the LAST SAVED version — save to refresh.
        </div>
      )}
      <iframe
        title="preview"
        srcDoc={`<html><body style="margin:0;padding:0;background:#F4F7F2;">${html ?? ''}</body></html>`}
        className="h-[600px] w-full border-0"
      />
    </div>
  );
}

/* ─────────────────────────── test-send dialog ─────────────────────────── */

function TestSendDialog({ open, onClose, onSend, pending }: {
  open: boolean;
  onClose: () => void;
  onSend: (to: string) => void;
  pending: boolean;
}) {
  const [to, setTo] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send a test email</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="to">Recipient email</Label>
          <Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@fsinnovation.net" />
          <p className="text-xs text-[var(--color-brand-muted)]">
            Uses placeholder values for personalisation vars (name → "Test recipient", farm_name → "Test Farm").
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button disabled={!to || pending} onClick={() => onSend(to)}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Send test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
