'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldPlus } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { readAdmin } from '@/lib/auth';
import { PermissionPicker } from '@/components/forms/permission-picker';
import {
  ROLE_LABELS,
  checkboxStateToPayload,
  type AdminRole,
} from '@/lib/permissions-catalog';

const ROLE_ORDER: AdminRole[] = ['super_admin', 'admin', 'support', 'analyst', 'read_only'];

export default function AdminsPage() {
  const me = readAdmin();

  // Identity fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('support');

  // Permission overrides: { 'tokens.adjust': true, 'farms.archive': true }
  // The picker writes here; we serialise to JSON on submit. The role's
  // own defaults are NEVER included — backend resolves them at request
  // time so we don't store them as overrides.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const m = useMutation({
    mutationFn: () =>
      endpoints.createAdmin({
        name,
        email,
        password,
        role,
        permissions:
          Object.keys(overrides).length > 0 ? checkboxStateToPayload(overrides) : null,
      }),
    onSuccess: (r) => {
      toast.success(`Created admin ${r.admin.name}.`);
      setName('');
      setEmail('');
      setPassword('');
      setOverrides({});
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (me?.role !== 'super_admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restricted</CardTitle>
          <CardDescription>Only super-admins can create new admin users.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin users"
        description="Create new platform staff. They will log in via the same /admin/auth/login endpoint."
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>New admin</CardTitle>
            <CardDescription>
              Password must be at least 10 characters. The admin can change it after first
              sign-in (admin profile editing is a planned sprint).
            </CardDescription>
          </div>
          <ShieldPlus className="h-5 w-5 text-[var(--color-brand-muted)]" />
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name || !email || password.length < 10) {
              toast.error('Name, email, and a ≥ 10-char password are required.');
              return;
            }
            m.mutate();
          }}
          className="space-y-6"
        >
          {/* Identity block */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="n">Name</Label>
              <Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ngozi Adamu" />
            </div>
            <div>
              <Label htmlFor="e">Email</Label>
              <Input
                id="e"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ngozi@fsinnovation.net"
              />
            </div>
            <div>
              <Label htmlFor="p">Password</Label>
              <Input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="≥ 10 chars"
              />
            </div>
            <div>
              <Label>Role</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {ROLE_ORDER.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      role === r
                        ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white'
                        : 'border-[var(--color-brand-border)] bg-white text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)]'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions block — replaces the old JSON textarea entirely */}
          <div>
            <Label>Permissions</Label>
            <p className="mb-3 text-xs text-[var(--color-brand-muted)]">
              Tick extra capabilities to grant on top of the {ROLE_LABELS[role]} role
              defaults. Already-granted permissions are locked.
            </p>
            <PermissionPicker role={role} value={overrides} onChange={setOverrides} />
          </div>

          {/* Submit row */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-brand-border)] pt-4">
            <Badge tone="primary">Audit logged</Badge>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <ShieldPlus className="h-4 w-4" /> Create admin
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
