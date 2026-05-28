'use client';

/**
 * Reusable form for recording an OFFLINE token purchase — bank transfer,
 * cash, USSD, POS.
 *
 *   - Used inside the "Record payment" tab on /tokens.
 *   - Used inside a Dialog on each account's detail page so an admin can
 *     credit a specific account without copy-pasting its ID.
 *
 * Backed by POST /api/v1/admin/tokens/manual-purchase.
 */

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiErrorMessage, endpoints } from '@/lib/api';

const PROVIDERS: { value: 'bank_transfer' | 'cash' | 'ussd' | 'pos' | 'other'; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'ussd', label: 'USSD' },
  { value: 'pos', label: 'POS terminal' },
  { value: 'other', label: 'Other' },
];

interface Props {
  /** If provided, the account-id field is locked to this value (contextual use). */
  presetAccountId?: string;
  /** Pre-fill currency (e.g. account.currency). Defaults to NGN. */
  defaultCurrency?: string;
  /** Called on success with the freshly created purchase + ledger ids. */
  onSuccess?: (ids: { purchaseId: string; ledgerEntryId: string }) => void;
  /** Hide the labelled header (when embedded in a dialog that has its own header). */
  compact?: boolean;
}

export function ManualPurchaseForm({
  presetAccountId,
  defaultCurrency = 'NGN',
  onSuccess,
  compact = false,
}: Props) {
  const [accountId, setAccountId] = useState(presetAccountId ?? '');
  const [tokenType, setTokenType] = useState<'broiler' | 'layer'>('broiler');
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [amountMajor, setAmountMajor] = useState<number | ''>('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]['value']>('bank_transfer');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Sync external preset (e.g. when dialog opens for a different account)
  useEffect(() => {
    if (presetAccountId !== undefined) setAccountId(presetAccountId);
  }, [presetAccountId]);

  const m = useMutation({
    mutationFn: () =>
      endpoints.tokenManualPurchase({
        account_id: accountId,
        token_type: tokenType,
        tier,
        quantity: Number(quantity),
        amount_minor: Math.round(Number(amountMajor) * 100), // major → minor
        currency: currency.toUpperCase(),
        provider,
        reference: reference.trim(),
        paid_at: paidAt,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (r) => {
      toast.success('Payment recorded. Tokens credited.');
      setQuantity('');
      setAmountMajor('');
      setReference('');
      setNotes('');
      onSuccess?.(r);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const valid =
    accountId.trim().length > 0 &&
    Number(quantity) >= 1 &&
    Number(amountMajor) >= 0 &&
    reference.trim().length >= 3 &&
    paidAt.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) {
          toast.error('Fill every required field. Quantity ≥ 1 and reference ≥ 3 chars.');
          return;
        }
        m.mutate();
      }}
      className="space-y-4"
    >
      {!compact && (
        <div className="rounded-lg border border-[var(--color-brand-border)] bg-[color:rgb(22_177_45/0.04)] p-3 text-xs text-[var(--color-brand-muted)]">
          <p className="flex items-center gap-1.5 font-medium text-[var(--color-brand-fg)]">
            <Banknote className="h-3.5 w-3.5" /> When to use this
          </p>
          <p className="mt-1">
            Use this form when a farmer pays you outside Paystack / Flutterwave —
            typically a bank transfer into your business account, but cash, USSD,
            and POS are supported too. The bank <strong>reference</strong> is the
            idempotency key — a duplicate reference returns 422 instead of
            double-crediting.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="mp-account">Account ID</Label>
          <Input
            id="mp-account"
            value={accountId}
            disabled={!!presetAccountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="01HXY…"
            className="font-mono text-xs"
          />
          {presetAccountId && (
            <p className="mt-1 text-[11px] text-[var(--color-brand-muted)]">
              Locked to this account.
            </p>
          )}
        </div>

        <div>
          <Label>Token type</Label>
          <select
            value={tokenType}
            onChange={(e) => setTokenType(e.target.value as 'broiler' | 'layer')}
            className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="broiler">Broiler</option>
            <option value="layer">Layer</option>
          </select>
        </div>
        <div>
          <Label>Tier</Label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as 'basic' | 'premium')}
            className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div>
          <Label htmlFor="mp-qty">Quantity (tokens to credit)</Label>
          <Input
            id="mp-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="mp-amount">Amount paid ({currency || 'NGN'})</Label>
          <Input
            id="mp-amount"
            type="number"
            step="0.01"
            min={0}
            value={amountMajor}
            onChange={(e) => setAmountMajor(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 25000.00"
          />
          <p className="mt-1 text-[11px] text-[var(--color-brand-muted)]">
            Enter the major-unit value the farmer paid (e.g. ₦25,000.00). We store it
            internally in minor units (kobo / pesewa / cents).
          </p>
        </div>

        <div>
          <Label>Currency</Label>
          <Input maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
        </div>
        <div>
          <Label>Provider</Label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as (typeof PROVIDERS)[number]['value'])}
            className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="mp-ref">Bank / payment reference</Label>
          <Input
            id="mp-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. FBN/0123456789"
            className="font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-[var(--color-brand-muted)]">
            Unique. Re-using a reference is rejected so we never double-credit.
          </p>
        </div>
        <div>
          <Label htmlFor="mp-paidat">Paid on</Label>
          <Input
            id="mp-paidat"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="mp-notes">Internal notes (optional)</Label>
          <Textarea
            id="mp-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Spoke to Adaeze on WhatsApp; receipt screenshot in #ops-payments"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">Audit logged</Badge>
          <Badge tone="accent">Counts as revenue</Badge>
          <Badge tone="info">Idempotent on reference</Badge>
        </div>
        <Button type="submit" disabled={m.isPending || !valid}>
          {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Receipt className="h-4 w-4" /> Record payment &amp; credit tokens
        </Button>
      </div>
    </form>
  );
}
