'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { endpoints } from '@/lib/api';
import { fmtDateTime, initials } from '@/lib/format';

export default function ProfilePage() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => endpoints.me() });

  if (me.isLoading) return <Skeleton className="h-64" />;
  if (!me.data) return <Card>Could not load profile.</Card>;

  const { admin, capabilities } = me.data;

  return (
    <div>
      <PageHeader title="My profile" description="Your admin identity and capabilities." />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-[var(--color-brand-primary)] text-2xl font-semibold text-white">
            {initials(admin.name)}
          </span>
          <h2 className="mt-3 text-lg font-semibold">{admin.name}</h2>
          <p className="text-sm text-[var(--color-brand-muted)]">{admin.email}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="primary" className="capitalize">
              {admin.role.replace('_', ' ')}
            </Badge>
            <Badge tone={admin.status === 'active' ? 'success' : 'danger'} className="capitalize">
              {admin.status}
            </Badge>
          </div>

          <dl className="mt-6 w-full space-y-2 text-left text-sm">
            <div className="flex justify-between border-t border-[var(--color-brand-border)] pt-2">
              <dt className="text-[var(--color-brand-muted)]">Last login</dt>
              <dd>{fmtDateTime(admin.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-brand-muted)]">Last login IP</dt>
              <dd className="font-mono text-xs">{admin.lastLoginIp ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-brand-muted)]">Created</dt>
              <dd>{fmtDateTime(admin.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Capabilities</CardTitle>
              <CardDescription>
                Role defaults plus any per-admin overrides in your <code>permissions</code> JSONB.
              </CardDescription>
            </div>
            <ShieldCheck className="h-5 w-5 text-[var(--color-brand-muted)]" />
          </CardHeader>

          {capabilities.length === 0 ? (
            <p className="text-sm text-[var(--color-brand-muted)]">No granted capabilities.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {capabilities.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2 rounded-md border border-[var(--color-brand-border)] bg-white px-3 py-2 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-brand-success)]" />
                  <code className="font-mono text-xs">{c}</code>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
