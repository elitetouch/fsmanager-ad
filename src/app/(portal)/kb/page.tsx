'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Library, Loader2, PlusCircle, Search } from 'lucide-react';
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
import { fmtDateTime } from '@/lib/format';

type Article = {
  id?: string; title?: string; slug?: string; summary?: string; body?: string;
  category?: string; tags?: string[]; is_published?: boolean;
  published_at?: string | null; updated_at?: string | null;
};

export default function KbPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const perPage = 25;

  const list = useQuery({
    queryKey: ['kb', { q, page }],
    queryFn: () => endpoints.listKbArticles({ q: q || undefined, page, per_page: perPage }),
  });

  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteKbArticle(id),
    onSuccess: () => { toast.success('Article deleted.'); qc.invalidateQueries({ queryKey: ['kb'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Knowledge base"
        description="Help articles for tenants. (Tenant-facing read API is a planned sprint.)"
        actions={<Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> New article</Button>}
      />

      <Card className="mb-4">
        <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title + body…" className="pl-9" />
          </div>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {list.isLoading && !list.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : list.data?.articles.length === 0 ? (
        <EmptyState icon={Library} title="No articles" />
      ) : (
        <>
          <Table>
            <THead><TR><TH>Title</TH><TH>Category</TH><TH>Status</TH><TH>Updated</TH><TH></TH></TR></THead>
            <TBody>
              {list.data?.articles.map((row) => {
                const a = row as Article;
                return (
                  <TR key={a.id}>
                    <TD className="font-medium">{a.title}</TD>
                    <TD className="capitalize text-[var(--color-brand-muted)]">{a.category ?? '—'}</TD>
                    <TD>{a.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="muted">Draft</Badge>}</TD>
                    <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(a.updated_at ?? null)}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => a.id && del.mutate(a.id)}>Delete</Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          {list.data?.meta && <Pagination page={list.data.meta.currentPage} lastPage={list.data.meta.lastPage} total={list.data.meta.total} perPage={list.data.meta.perPage} onChange={setPage} />}
        </>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="w-[min(820px,calc(100vw-2rem))]">
          <DialogHeader><DialogTitle>New article</DialogTitle><DialogDescription>Slug auto-derived when blank.</DialogDescription></DialogHeader>
          <ArticleForm onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['kb'] }); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="w-[min(820px,calc(100vw-2rem))]">
          <DialogHeader><DialogTitle>Edit article</DialogTitle></DialogHeader>
          {editing && <ArticleForm initial={editing} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['kb'] }); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArticleForm({ initial, onDone }: { initial?: Article; onDone: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);

  const m = useMutation({
    mutationFn: () => {
      const payload = { title, slug: slug || undefined, summary: summary || null, body, category: category || null, is_published: isPublished };
      return initial?.id ? endpoints.updateKbArticle(initial.id, payload) : endpoints.createKbArticle(payload);
    },
    onSuccess: () => { toast.success(initial ? 'Article updated.' : 'Article created.'); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="grid gap-3">
      <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Slug (auto)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-xs" /></div>
        <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. billing, account, getting-started" /></div>
      </div>
      <div><Label>Summary</Label><Input value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
      <div><Label>Body (markdown)</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[200px]" required /></div>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> Published</label>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
      </DialogFooter>
    </form>
  );
}
