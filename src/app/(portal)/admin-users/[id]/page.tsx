'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Ban, CheckCircle2, KeyRound, Loader2, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PermissionPicker } from '@/components/forms/permission-picker';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, initials } from '@/lib/format';
import { readAdmin } from '@/lib/auth';
import { ROLE_LABELS, type AdminRole } from '@/lib/permissions-catalog';

const ROLE_ORDER: AdminRole[] = ['super_admin', 'admin', 'support', 'analyst', 'read_only'];

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const me = readAdmin();

  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>('support');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const detail = useQuery({ queryKey: ['admin-user', id], queryFn: () => endpoints.showAdminUser(id) });

  useEffect(() => {
    if (detail.data?.admin) {
      setName(detail.data.admin.name);
      setRole(detail.data.admin.role as AdminRole);
      const perms = (detail.data.admin.permissions ?? {}) as Record<string, unknown>;
      const flat: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(perms)) {
        if (v === true) flat[k] = true;
      }
      setOverrides(flat);
    }
  }, [detail.data]);

  const update = useMutation({
    mutationFn: () =>
      endpoints.updateAdminUser(id, {
        name,
        role,
        permissions: Object.keys(overrides).length > 0 ? overrides as Record<string, unknown> : null,
      }),
    onSuccess: () => {
      toast.success('Admin updated.');
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const suspend = useMutation({
    mutationFn: () => endpoints.suspendAdminUser(id),
    onSuccess: () => { toast.success('Admin suspended.'); qc.invalidateQueries({ queryKey: ['admin-user', id] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unsuspend = useMutation({
    mutationFn: () => endpoints.unsuspendAdminUser(id),
    onSuccess: () => { toast.success('Admin reinstated.'); qc.invalidateQueries({ queryKey: ['admin-user', id] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const resetPw = useMutation({
    mutationFn: () => endpoints.resetAdminPassword(id),
    onSuccess: (r) => {
      toast.success('Password reset.');
      // Show the temp password in a modal-style toast users can read + copy.
      window.alert(`Temporary password for this admin:\n\n${r.temporaryPassword}\n\nShare it securely. They should change it on first login.`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => endpoints.deleteAdminUser(id),
    onSuccess: () => { toast.success('Admin archived.'); qc.invalidateQueries({ queryKey: ['admin-user', id] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (detail.isLoading) return <Skeleton className="h-64" />;
  if (!detail.data) {
    return <Card><p>Admin not found.</p><Button asChild variant="link"><Link href="/admin-users"><ArrowLeft className="h-4 w-4" /> Back</Link></Button></Card>;
  }

  const a = detail.data.admin;
  const isSelf = me?.id === a.id;
  const canSelfProtect = isSelf;

  return (
    <div>
      <Button variant="link" asChild className="mb-2">
        <Link href="/admin-users"><ArrowLeft className="h-4 w-4" /> Back to admin users</Link>
      </Button>

      <PageHeader
        title={a.name}
        description={a.email}
        actions={
          <>
            {a.status === 'active' && !canSelfProtect && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="danger"><Ban className="h-4 w-4" /> Suspend</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Suspend this admin?</DialogTitle>
                    <DialogDescription>
                      Revokes all their Sanctum tokens and marks them as suspended. The audit
                      trail is preserved.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="danger" onClick={() => suspend.mutate()} disabled={suspend.isPending}>Suspend</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {a.status === 'suspended' && (
              <Button variant="primary" onClick={() => unsuspend.mutate()} disabled={unsuspend.isPending}>
                <CheckCircle2 className="h-4 w-4" /> Reinstate
              </Button>
            )}
            {!canSelfProtect && (
              <Button variant="secondary" onClick={() => resetPw.mutate()} disabled={resetPw.isPending}>
                <KeyRound className="h-4 w-4" /> Reset password
              </Button>
            )}
            {!canSelfProtect && a.status !== 'archived' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost"><Trash2 className="h-4 w-4" /> Archive</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Archive this admin?</DialogTitle>
                    <DialogDescription>
                      Marks the admin as archived and revokes their tokens. We never hard-delete
                      so audit history is preserved.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="danger" onClick={() => del.mutate()} disabled={del.isPending}>Archive</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <div className="flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-brand-primary)] text-xl font-semibold text-white">
              {initials(a.name)}
            </span>
            <h2 className="mt-3 text-lg font-semibold">{a.name}</h2>
            <p className="text-sm text-[var(--color-brand-muted)]">{a.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge tone="primary" className="capitalize">{a.role.replace('_', ' ')}</Badge>
              <Badge tone={a.status === 'active' ? 'success' : a.status === 'suspended' ? 'warning' : 'muted'} className="capitalize">{a.status}</Badge>
            </div>
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between border-t border-[var(--color-brand-border)] pt-2">
              <dt className="text-[var(--color-brand-muted)]">Admin ID</dt>
              <dd className="font-mono text-xs">{a.id.slice(0, 12)}…</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-brand-muted)]">Last login</dt>
              <dd>{fmtDateTime(a.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-brand-muted)]">Last IP</dt>
              <dd className="font-mono text-xs">{a.lastLoginIp ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-brand-muted)]">Created</dt>
              <dd>{fmtDateTime(a.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Edit admin</CardTitle>
              <CardDescription>
                Name, role and per-admin permission overrides. Role defaults are locked on the
                permission picker — overrides stack ON TOP of them.
              </CardDescription>
            </div>
          </CardHeader>

          <form
            onSubmit={(e) => { e.preventDefault(); update.mutate(); }}
            className="space-y-6"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={canSelfProtect} />
              </div>
              <div>
                <Label>Role</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {ROLE_ORDER.map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={canSelfProtect}
                      onClick={() => setRole(r)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        role === r
                          ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white'
                          : 'border-[var(--color-brand-border)] bg-white text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)] disabled:opacity-50'
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Permissions</Label>
              <p className="mb-3 text-xs text-[var(--color-brand-muted)]">
                Tick extra capabilities to grant on top of the {ROLE_LABELS[role]} role defaults.
              </p>
              <PermissionPicker role={role} value={overrides} onChange={setOverrides} />
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-brand-border)] pt-4">
              <Badge tone="primary">Audit logged</Badge>
              <Button type="submit" disabled={update.isPending || canSelfProtect}>
                {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
            {canSelfProtect && (
              <p className="text-xs text-[var(--color-brand-warning)]">
                You can&apos;t edit your own admin record here — use the profile endpoint.
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
