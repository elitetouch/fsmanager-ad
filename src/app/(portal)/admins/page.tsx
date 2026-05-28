'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldPlus } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { readAdmin } from '@/lib/auth';

const ROLES: { value: 'super_admin' | 'admin' | 'support' | 'analyst' | 'read_only'; label: string; tone: string }[] = [
  { value: 'super_admin', label: 'Super admin', tone: 'primary' },
  { value: 'admin', label: 'Admin', tone: 'info' },
  { value: 'support', label: 'Support', tone: 'accent' },
  { value: 'analyst', label: 'Analyst', tone: 'muted' },
  { value: 'read_only', label: 'Read-only', tone: 'muted' },
];

export default function AdminsPage() {
  const me = readAdmin();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]['value']>('support');
  const [permsJson, setPermsJson] = useState('');

  const m = useMutation({
    mutationFn: () =>
      endpoints.createAdmin({
        name,
        email,
        password,
        role,
        permissions: permsJson.trim() ? (JSON.parse(permsJson) as Record<string, unknown>) : null,
      }),
    onSuccess: (r) => {
      toast.success(`Created admin ${r.admin.name}.`);
      setName('');
      setEmail('');
      setPassword('');
      setPermsJson('');
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

      <Card className="max-w-3xl">
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
            try {
              if (permsJson.trim()) JSON.parse(permsJson);
            } catch {
              toast.error('Permissions JSON is not valid.');
              return;
            }
            m.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div>
            <Label htmlFor="n">Name</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ngozi Adamu" />
          </div>
          <div>
            <Label htmlFor="e">Email</Label>
            <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ngozi@fsinnovation.net" />
          </div>
          <div>
            <Label htmlFor="p">Password</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="≥ 10 chars" />
          </div>
          <div>
            <Label>Role</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    role === r.value
                      ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white'
                      : 'border-[var(--color-brand-border)] bg-white text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="perms">Permissions (optional JSON overrides)</Label>
            <Textarea
              id="perms"
              value={permsJson}
              onChange={(e) => setPermsJson(e.target.value)}
              placeholder='e.g. {"tokens.adjust": true}'
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[11px] text-[var(--color-brand-muted)]">
              JSON merged on top of role defaults. Flat or nested both work.
            </p>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2">
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
