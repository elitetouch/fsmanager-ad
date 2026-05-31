'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiErrorMessage, endpoints } from '@/lib/api';

export default function TwoFactorPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => endpoints.me() });

  const [setupPayload, setSetupPayload] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [manageCode, setManageCode] = useState('');

  const setup = useMutation({
    mutationFn: () => endpoints.twoFactorSetup(),
    onSuccess: (r) => { setSetupPayload(r); setRecoveryCodes(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const confirm = useMutation({
    mutationFn: () => endpoints.twoFactorConfirm(confirmCode),
    onSuccess: (r) => {
      setRecoveryCodes(r.recoveryCodes);
      setConfirmCode('');
      setSetupPayload(null);
      toast.success('2FA enabled — store your recovery codes!');
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const disable = useMutation({
    mutationFn: () => endpoints.twoFactorDisable(manageCode),
    onSuccess: () => {
      toast.success('2FA disabled.');
      setManageCode('');
      setRecoveryCodes(null);
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const regenerate = useMutation({
    mutationFn: () => endpoints.twoFactorRegenerate(manageCode),
    onSuccess: (r) => { toast.success('Recovery codes regenerated.'); setRecoveryCodes(r.recoveryCodes); setManageCode(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const isEnabled = Boolean((me.data?.admin as Record<string, unknown> | undefined)?.two_factor_enabled);

  return (
    <div>
      <PageHeader
        title="Two-factor authentication"
        description="Add a second factor — TOTP via Google Authenticator, 1Password, Authy etc. — to your admin login."
      />

      <Card>
        <div className="flex items-start gap-4">
          {isEnabled ? <ShieldCheck className="h-10 w-10 text-emerald-600" /> : <ShieldAlert className="h-10 w-10 text-amber-600" />}
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{isEnabled ? '2FA is enabled' : '2FA is not enabled'}</h2>
            <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
              {isEnabled
                ? 'Your account is protected by a time-based one-time password. You can disable it or regenerate recovery codes below.'
                : 'Anyone with your password can log in. Enable TOTP now to add a second factor.'}
            </p>
            {!isEnabled && !setupPayload && (
              <Button className="mt-4" onClick={() => setup.mutate()} disabled={setup.isPending}>
                {setup.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Begin setup
              </Button>
            )}
          </div>
          {isEnabled && <Badge tone="success">Enabled</Badge>}
        </div>
      </Card>

      {setupPayload && !isEnabled && (
        <Card>
          <h3 className="text-base font-semibold">Step 1 — scan or paste into your authenticator</h3>
          <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Scan the QR or paste the secret. Then enter the 6-digit code to confirm.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <img
                alt="QR for TOTP setup"
                className="h-48 w-48 rounded-[var(--radius-card)] border border-[var(--color-brand-border)] bg-white p-2"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupPayload.otpauthUri)}`}
              />
              <p className="mt-2 break-all font-mono text-xs text-[var(--color-brand-muted)]">{setupPayload.secret}</p>
            </div>
            <div className="flex flex-col">
              <h4 className="text-sm font-semibold">Then confirm</h4>
              <p className="mt-1 text-xs text-[var(--color-brand-muted)]">After scanning, enter the 6-digit code from your app.</p>
              <div className="mt-3">
                <Label>6-digit code</Label>
                <Input
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  className="font-mono tracking-widest"
                />
              </div>
              <Button
                className="mt-3 self-start"
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending || confirmCode.length !== 6}
              >
                {confirm.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm and enable
              </Button>
            </div>
          </div>
        </Card>
      )}

      {recoveryCodes && (
        <Card>
          <h3 className="text-base font-semibold">Recovery codes</h3>
          <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
            Store these somewhere safe — they will <strong>not be shown again</strong>. Each code works once if you lose access to your authenticator.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1 rounded-[var(--radius-card)] bg-[var(--color-brand-bg)] p-3 font-mono text-xs sm:grid-cols-3">
            {recoveryCodes.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </Card>
      )}

      {isEnabled && (
        <Card>
          <h3 className="text-base font-semibold">Manage 2FA</h3>
          <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Enter a current 6-digit code from your authenticator to authorise either of these actions.</p>
          <div className="mt-3 max-w-sm">
            <Label>6-digit code</Label>
            <Input
              value={manageCode}
              onChange={(e) => setManageCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="font-mono tracking-widest"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending || manageCode.length !== 6}
            >
              {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerate recovery codes
            </Button>
            <Button
              variant="danger"
              onClick={() => disable.mutate()}
              disabled={disable.isPending || manageCode.length !== 6}
            >
              {disable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Disable 2FA
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
