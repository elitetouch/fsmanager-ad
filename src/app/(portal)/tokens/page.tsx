'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CircleDollarSign, Loader2, PlusCircle, Receipt, Sparkles, Wallet } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtInt, fmtMinor } from '@/lib/format';
import { ManualPurchaseForm } from '@/components/forms/manual-purchase-form';

export default function TokensPage() {
  return (
    <div>
      <PageHeader
        title="Tokens"
        description="Cross-account balances, ledger, prices, purchases, and manual adjustments."
      />

      <Tabs defaultValue="balances">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="adjust">Adjust</TabsTrigger>
          <TabsTrigger value="manual-purchase">Record payment</TabsTrigger>
          <TabsTrigger value="prices">Prices</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="balances">
          <BalancesPanel />
        </TabsContent>
        <TabsContent value="ledger">
          <LedgerPanel />
        </TabsContent>
        <TabsContent value="adjust">
          <AdjustPanel />
        </TabsContent>
        <TabsContent value="manual-purchase">
          <ManualPurchasePanel />
        </TabsContent>
        <TabsContent value="prices">
          <PricesPanel />
        </TabsContent>
        <TabsContent value="purchases">
          <PurchasesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BalancesPanel() {
  const [country, setCountry] = useState('');
  const [tokenType, setTokenType] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 50;
  const q = useQuery({
    queryKey: ['token-balances', { country, tokenType, page }],
    queryFn: () =>
      endpoints.tokenBalances({
        country: country || undefined,
        token_type: tokenType || undefined,
        page,
        per_page: perPage,
      }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="Country"
            className="sm:w-32"
          />
          <select
            value={tokenType}
            onChange={(e) => setTokenType(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any type</option>
            <option value="broiler">Broiler</option>
            <option value="layer">Layer</option>
          </select>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {q.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Account</TH>
                <TH>Country</TH>
                <TH>Type · Tier</TH>
                <TH>Balance</TH>
                <TH>Updated</TH>
              </TR>
            </THead>
            <TBody>
              {q.data?.rows.map((r) => (
                <TR key={`${r.account_id}-${r.token_type}-${r.tier}`}>
                  <TD>
                    <p className="font-medium">{r.account_name ?? '—'}</p>
                    <p className="text-[11px] text-[var(--color-brand-muted)]">{String(r.account_id).slice(0, 8)}…</p>
                  </TD>
                  <TD>{r.country_code ?? '—'}</TD>
                  <TD className="capitalize">{r.token_type} · {r.tier}</TD>
                  <TD className="font-medium">{fmtInt(r.balance)}</TD>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(r.updated_at ?? null)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {q.data?.meta && (
            <Pagination
              page={q.data.meta.currentPage}
              lastPage={q.data.meta.lastPage}
              total={q.data.meta.total}
              perPage={q.data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function LedgerPanel() {
  const [accountId, setAccountId] = useState('');
  const [entryType, setEntryType] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 50;
  const q = useQuery({
    queryKey: ['token-ledger', { accountId, entryType, page }],
    queryFn: () =>
      endpoints.tokenLedger({
        account_id: accountId || undefined,
        entry_type: entryType || undefined,
        page,
        per_page: perPage,
      }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <Input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Account ID (UUID)"
            className="flex-1"
          />
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any entry type</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {q.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Account</TH>
                <TH>Type · Tier</TH>
                <TH>Entry</TH>
                <TH>Qty</TH>
                <TH>Reason</TH>
              </TR>
            </THead>
            <TBody>
              {q.data?.rows.map((l) => (
                <TR key={l.id}>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(l.created_at)}</TD>
                  <TD className="font-mono text-xs">{String(l.account_id).slice(0, 8)}…</TD>
                  <TD className="capitalize">{l.token_type} · {l.tier}</TD>
                  <TD>
                    <Badge tone={l.entry_type === 'credit' ? 'success' : 'warning'} className="capitalize">
                      {l.entry_type}
                    </Badge>
                  </TD>
                  <TD className="font-medium">{l.entry_type === 'debit' ? '−' : '+'}{fmtInt(l.quantity)}</TD>
                  <TD className="text-xs">{l.reason || '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {q.data?.meta && (
            <Pagination
              page={q.data.meta.currentPage}
              lastPage={q.data.meta.lastPage}
              total={q.data.meta.total}
              perPage={q.data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function ManualPurchasePanel() {
  const qc = useQueryClient();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Record an offline payment</CardTitle>
          <CardDescription>
            For farmers who pay by bank transfer, cash, USSD, or POS instead of card.
            Creates a `success`-status purchase row and a ledger credit in one
            atomic operation.
          </CardDescription>
        </div>
        <Receipt className="h-5 w-5 text-[var(--color-brand-muted)]" />
      </CardHeader>

      <ManualPurchaseForm
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['token-balances'] });
          qc.invalidateQueries({ queryKey: ['token-ledger'] });
          qc.invalidateQueries({ queryKey: ['token-purchases'] });
        }}
      />
    </Card>
  );
}

function AdjustPanel() {
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [tokenType, setTokenType] = useState<'broiler' | 'layer'>('broiler');
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('credit');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');

  const m = useMutation({
    mutationFn: () =>
      endpoints.tokenAdjust({
        account_id: accountId,
        token_type: tokenType,
        tier,
        entry_type: entryType,
        quantity: Number(quantity),
        reason,
      }),
    onSuccess: (r) => {
      toast.success(`Ledger entry ${String(r.ledgerEntryId).slice(0, 8)}… recorded.`);
      setQuantity('');
      setReason('');
      qc.invalidateQueries({ queryKey: ['token-ledger'] });
      qc.invalidateQueries({ queryKey: ['token-balances'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Manual adjustment</CardTitle>
          <CardDescription>
            Credit or debit an account&apos;s token balance. The reason is stored on the
            ledger row and in the admin audit log.
          </CardDescription>
        </div>
        <Wallet className="h-5 w-5 text-[var(--color-brand-muted)]" />
      </CardHeader>

      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!accountId || !quantity || !reason || Number(quantity) < 1) {
            toast.error('Fill every field. Quantity must be ≥ 1.');
            return;
          }
          m.mutate();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="account">Account ID</Label>
          <Input id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="01HXY…" />
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
          <Label>Entry</Label>
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as 'credit' | 'debit')}
            className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="credit">Credit (+)</option>
            <option value="debit">Debit (−)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="qty">Quantity</Label>
          <Input
            id="qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="reason">Reason (visible in audit log)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Goodwill credit after platform downtime 2026-05-18"
          />
        </div>
        <div className="sm:col-span-2 flex items-center justify-end">
          <Button type="submit" disabled={m.isPending}>
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <CircleDollarSign className="h-4 w-4" /> Adjust balance
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PricesPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['token-prices'], queryFn: () => endpoints.tokenPrices(false) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4" /> New price
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activate a new token price</DialogTitle>
              <DialogDescription>
                The current active price for the same (type, tier) is deactivated atomically.
              </DialogDescription>
            </DialogHeader>
            <NewPriceForm onDone={() => qc.invalidateQueries({ queryKey: ['token-prices'] })} />
          </DialogContent>
        </Dialog>
      </div>

      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Active</TH>
              <TH>Token</TH>
              <TH>Tier</TH>
              <TH>Unit price</TH>
              <TH>Currency</TH>
              <TH>Effective from</TH>
            </TR>
          </THead>
          <TBody>
            {q.data?.rows.map((p) => (
              <TR key={p.id}>
                <TD>
                  {p.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Past</Badge>}
                </TD>
                <TD className="capitalize">{p.token_type}</TD>
                <TD className="capitalize">{p.tier}</TD>
                <TD className="font-medium">{fmtMinor(p.unit_price_minor, p.currency)}</TD>
                <TD>{p.currency}</TD>
                <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(p.effective_from ?? null)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

function NewPriceForm({ onDone }: { onDone: () => void }) {
  const [tokenType, setTokenType] = useState<'broiler' | 'layer'>('broiler');
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  const [unitPriceMinor, setUnitPriceMinor] = useState<number | ''>('');
  const [currency, setCurrency] = useState('NGN');

  const m = useMutation({
    mutationFn: () =>
      endpoints.createTokenPrice({
        token_type: tokenType,
        tier,
        unit_price_minor: Number(unitPriceMinor),
        currency,
      }),
    onSuccess: () => {
      toast.success('Price activated.');
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!unitPriceMinor || Number(unitPriceMinor) < 1) {
          toast.error('Unit price must be a positive integer (minor units).');
          return;
        }
        m.mutate();
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
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
        <Label>Unit price (minor units)</Label>
        <Input
          type="number"
          min={1}
          value={unitPriceMinor}
          onChange={(e) => setUnitPriceMinor(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <p className="mt-1 text-[11px] text-[var(--color-brand-muted)]">
          Kobo / pesewa / cents — e.g. ₦150.00 = 15000
        </p>
      </div>
      <div>
        <Label>Currency</Label>
        <Input maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
      </div>
      <DialogFooter className="sm:col-span-2">
        <Button type="submit" disabled={m.isPending}>
          <Sparkles className="h-4 w-4" /> Activate
        </Button>
      </DialogFooter>
    </form>
  );
}

function PurchasesPanel() {
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 50;
  const q = useQuery({
    queryKey: ['token-purchases', { status, provider, page }],
    queryFn: () =>
      endpoints.tokenPurchases({
        status: status || undefined,
        provider: provider || undefined,
        page,
        per_page: perPage,
      }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPage(1); }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="h-10 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white px-3 text-sm"
          >
            <option value="">Any provider</option>
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
          </select>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </Card>

      {q.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Provider</TH>
                <TH>Status</TH>
                <TH>Tokens</TH>
                <TH>Amount</TH>
                <TH>Credited</TH>
              </TR>
            </THead>
            <TBody>
              {q.data?.rows.map((p) => (
                <TR key={p.id}>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(p.created_at)}</TD>
                  <TD className="capitalize">{p.provider}</TD>
                  <TD>
                    <Badge
                      tone={
                        p.status === 'success'
                          ? 'success'
                          : p.status === 'failed'
                            ? 'danger'
                            : p.status === 'pending'
                              ? 'warning'
                              : 'muted'
                      }
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </TD>
                  <TD>{fmtInt(p.quantity)} · {p.token_type}/{p.tier}</TD>
                  <TD className="font-medium">{fmtMinor(p.amount_minor, p.currency)}</TD>
                  <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(p.credited_at ?? null)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {q.data?.meta && (
            <Pagination
              page={q.data.meta.currentPage}
              lastPage={q.data.meta.lastPage}
              total={q.data.meta.total}
              perPage={q.data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
