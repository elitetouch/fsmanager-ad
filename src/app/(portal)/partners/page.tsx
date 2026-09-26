'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, PlusCircle, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PARTNER_SCOPES, PartnerForm, type PartnerFormValues } from '@/components/forms/partner-form';
import { apiErrorMessage, apiFieldErrors, endpoints } from '@/lib/api';
import { fmtRelative } from '@/lib/format';
import { adminCan, readAdmin } from '@/lib/auth';

/**
 * API partners — outside organisations (e.g. EWDSS) whose own apps use
 * PENKEEP devices through the partner API with an API key.
 *
 * Flow: create partner → issue a key on its page (shown once) → allocate
 * devices to it → the partner links them in its app.
 */
export default function PartnersPage() {
  const router = useRouter();
  const canManage = adminCan(readAdmin(), 'partners.manage');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const perPage = 25;

  const list = useQuery({
    queryKey: ['api-partners', { search, status, page }],
    queryFn: () => endpoints.listApiPartners({ q: search || undefined, status: status || undefined, page, per_page: perPage }),
  });

  const create = useMutation({
    mutationFn: (values: PartnerFormValues) => endpoints.createApiPartner(values),
    onSuccess: (res) => {
      toast.success(`${res.partner.name} created. Next, issue an API key.`);
      setCreating(false);
      router.push(`/partners/${res.partner.id}`);
    },
    onError: (e) => {
      if (Object.keys(apiFieldErrors(e)).length === 0) toast.error(apiErrorMessage(e));
    },
  });

  const partners = list.data?.partners ?? [];
  const filtered = search !== '' || status !== '';
  const scopeLabel = (key: string) => PARTNER_SCOPES.find((s) => s.key === key)?.label ?? key;

  return (
    <div className="space-y-5">
      <PageHeader
        title="API partners"
        description="Organisations whose own apps use PENKEEP devices through the partner API — like EWDSS. Create a partner, issue them a key, then allocate devices to them."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => list.refetch()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <PlusCircle className="h-3.5 w-3.5" /> New partner
              </Button>
            )}
          </div>
        }
      />

      <Card className="p-3">
        <form
          className="flex flex-wrap items-center gap-2"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q.trim());
          }}
        >
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brand-muted)]" />
            <Input
              aria-label="Search partners"
              className="pl-9"
              placeholder="Search by name, partner ID or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </Card>

      {list.isLoading && !list.data ? (
        <Card className="p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : list.isError ? (
        <EmptyState icon={KeyRound} title="Couldn't load partners" description={apiErrorMessage(list.error)} action={<Button variant="secondary" onClick={() => list.refetch()}>Try again</Button>} />
      ) : partners.length === 0 ? (
        filtered ? (
          <EmptyState icon={Search} title="No partners match" description="Try a different search or clear the status filter." />
        ) : (
          <EmptyState
            icon={KeyRound}
            title="No API partners yet"
            description="Create a partner to give an outside app, like EWDSS, access to PENKEEP devices."
            action={canManage ? <Button onClick={() => setCreating(true)}><PlusCircle className="h-4 w-4" /> New partner</Button> : undefined}
          />
        )
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Partner</TH>
                <TH>Status</TH>
                <TH className="hidden md:table-cell">Permissions</TH>
                <TH className="text-right">Active keys</TH>
                <TH className="text-right">Devices</TH>
                <TH className="hidden lg:table-cell">Last API call</TH>
              </TR>
            </THead>
            <TBody>
              {partners.map((p) => (
                <TR key={p.id} className="cursor-pointer" onClick={() => router.push(`/partners/${p.id}`)}>
                  <TD>
                    <Link href={`/partners/${p.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                      {p.name}
                    </Link>
                    <div className="font-mono text-xs text-[var(--color-brand-muted)]">{p.slug}</div>
                  </TD>
                  <TD>{p.status === 'active' ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Suspended</Badge>}</TD>
                  <TD className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.scopes.map((s) => <Badge key={s} tone="primary">{scopeLabel(s)}</Badge>)}
                    </div>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {p.active_keys_count === 0 ? <Badge tone="warning">None</Badge> : p.active_keys_count}
                  </TD>
                  <TD className="text-right tabular-nums">{p.devices_count}</TD>
                  <TD className="hidden text-[var(--color-brand-muted)] lg:table-cell">{p.last_used_at ? fmtRelative(p.last_used_at) : 'Never'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {list.data?.meta && list.data.meta.last_page > 1 && (
            <Pagination
              page={list.data.meta.current_page}
              lastPage={list.data.meta.last_page}
              total={list.data.meta.total}
              perPage={list.data.meta.per_page}
              onChange={setPage}
            />
          )}
        </>
      )}

      <Dialog open={creating} onOpenChange={(open) => { setCreating(open); if (!open) create.reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New API partner</DialogTitle>
            <DialogDescription>You&apos;ll issue their API key on the next screen.</DialogDescription>
          </DialogHeader>
          <PartnerForm
            submitting={create.isPending}
            errors={apiFieldErrors(create.error)}
            submitLabel="Create partner"
            onSubmit={(v) => create.mutate(v)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
