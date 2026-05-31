'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Logo } from '@/components/brand/logo';
import { endpoints } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api';
import { readToken, writeAdmin, writeToken } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

/** Detects the backend's "2FA code required" signal from a login failure. */
function isTwoFactorChallenge(err: unknown): boolean {
  if (!(err instanceof AxiosError) || err.response?.status !== 422) return false;
  const errors = (err.response.data as { errors?: Record<string, unknown> } | undefined)?.errors;
  return Boolean(errors && 'code' in errors);
}

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    // If a token already exists, fast-forward to the dashboard.
    if (readToken()) router.replace('/overview');
  }, [router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const { admin, token } = await endpoints.login(
        values.email,
        values.password,
        twoFactor ? code : undefined,
      );
      writeToken(token);
      // The /auth/me follow-up gives us the role-default capabilities array.
      // We persist both so the sidebar can hide commands the admin can't fire.
      try {
        const me = await endpoints.me();
        writeAdmin({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          status: admin.status,
          capabilities: me.capabilities,
        });
      } catch {
        writeAdmin({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          status: admin.status,
        });
      }
      toast.success(`Welcome back, ${admin.name.split(' ')[0]}.`);
      router.replace('/overview');
    } catch (err) {
      if (!twoFactor && isTwoFactorChallenge(err)) {
        // Backend confirmed email/password are valid but TOTP is required.
        setTwoFactor(true);
        toast.info('Enter the 6-digit code from your authenticator.');
      } else if (twoFactor && isTwoFactorChallenge(err)) {
        toast.error('Invalid 2FA code. Try again.');
        setCode('');
      } else {
        toast.error(apiErrorMessage(err, 'Could not sign you in.'));
      }
    } finally {
      setPending(false);
    }
  }

  function backToPassword() {
    setTwoFactor(false);
    setCode('');
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — gradient runs from vivid lime through dark forest. */}
      <section className="relative hidden flex-col justify-between bg-gradient-to-br from-[var(--color-brand-primary)] via-[var(--color-brand-primary-dark)] to-[#062c0d] p-12 text-white lg:flex">
        {/*
          Logo (white tone, big enough to read the embedded wordmark) sits
          at the top. The image already contains "FARM SUPPORT INNOVATION",
          so we don't layer extra wordmark text next to it — only the
          "Super-admin portal" sub-line below for context.
        */}
        <div>
          <Logo size={160} tone="white" />
          <p className="mt-2 text-xs uppercase tracking-[0.22em] opacity-75">
            Super-admin portal
          </p>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">
            Operate Farm Support Innovation with confidence.
          </h1>
          <p className="mt-4 text-sm leading-relaxed opacity-85">
            One control surface for every farm, every flock, every token.
            Live dashboards, segmentation, support inbox, and an immutable
            audit trail — all behind your admin Sanctum session.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
            {[
              ['Tenants', 'Suspend, verify, segment, note.'],
              ['Farms', 'Archive, restore, audit, follow.'],
              ['Tokens', 'Adjust balances with reason + ledger.'],
              ['Support', 'In-house inbox with internal notes.'],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{title}</p>
                <p className="mt-1 text-[12px] leading-tight opacity-80">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] uppercase tracking-[0.22em] opacity-60">
          © {new Date().getFullYear()} Farm Support Innovation · v1
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {twoFactor ? 'Two-factor authentication' : 'Sign in to admin'}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
            {twoFactor
              ? 'Open your authenticator app and enter the 6-digit code, or use a recovery code.'
              : 'Use your platform-staff credentials.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className={twoFactor ? 'hidden' : 'space-y-1.5'}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="ops@fsinnovation.net"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-[var(--color-brand-danger)]">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className={twoFactor ? 'hidden' : 'space-y-1.5'}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-[var(--color-brand-danger)]">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {twoFactor && (
              <div className="space-y-1.5">
                <Label htmlFor="code">Authenticator code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={20}
                  placeholder="123456 or ABCD-EFGH"
                  className="font-mono tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                />
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-brand-muted)]">
                  <ShieldCheck className="h-3 w-3" /> 6-digit TOTP or one of your recovery codes.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={pending || (twoFactor && code.length < 6)}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {twoFactor ? 'Verify and continue' : 'Sign in'}
            </Button>

            {twoFactor && (
              <Button type="button" variant="ghost" className="w-full" onClick={backToPassword}>
                Back to password
              </Button>
            )}
          </form>

          <p className="mt-6 text-xs text-[var(--color-brand-muted)]">
            Admin portal · separate from the tenant app. Wrong door? Tenants
            sign in at <code className="text-[var(--color-brand-fg)]">/api/v1/login</code> on the
            mobile/web client.
          </p>
        </div>
      </section>
    </main>
  );
}
