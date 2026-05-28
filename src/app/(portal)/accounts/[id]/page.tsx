'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Banknote } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ManualPurchaseForm } from '@/components/forms/manual-purchase-form';
import { adminCan, readAdmin } from '@/lib/auth';
import { endpoints } from '@/lib/api';
import { fmtDate, fmtDateTime, fmtInt, fmtMinor } from '@/lib/format';

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);
  const me = readAdmin();
  const canManualPurchase = adminCan(me, 'tokens.manual_purchase');

  const { data, isLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: () => endpoints.showAccount(id),
  });

  if (isLoading || !data) return <Skeleton className="h-64" />;
  const { account, tokenBalances, recentLedger, recentPurchases } = data;

  return (
    <div>
      <Button variant="link" asChild className="mb-2">
        <Link href="/accounts">
          <ArrowLeft className="h-4 w-4" /> Back to accounts
        </Link>
      </Button>

      <PageHeader
        title={account.name}
        description={`${account.countryCode} · ${account.currency}`}
        actions={
          <>
            {canManualPurchase && (
              <Button onClick={() => setRecordOpen(true)}>
                <Banknote className="h-4 w-4" /> Record payment
              </Button>
            )}
            {account.isActive && !account.archivedAt ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="muted">Inactive</Badge>
            )}
          </>
        }
      />

      {/* Manual purchase dialog — pre-fills account_id + currency. */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Record offline payment for {account.name}</DialogTitle>
            <DialogDescription>
              Bank transfer, cash, USSD, or POS. Creates a successful purchase
              row and credits the account&apos;s tokens in one atomic operation.
            </DialogDescription>
          </DialogHeader>
          <ManualPurchaseForm
            presetAccountId={String(account.id)}
            defaultCurrency={account.currency}
            onSuccess={() => {
              setRecordOpen(false);
              qc.invalidateQueries({ queryKey: ['account', id] });
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Token balances</CardTitle>
              <CardDescription>Pre-paid credits per type and tier.</CardDescription>
            </div>
          </CardHeader>
          {tokenBalances.length === 0 ? (
            <p className="text-sm text-[var(--color-brand-muted)]">No balances yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-brand-border)]">
              {tokenBalances.map((b) => (
                <li
                  key={`${b.tokenType}-${b.tier}`}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{b.tokenType} · {b.tier}</p>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-brand-muted)]">tokens</p>
                  </div>
                  <strong className="text-lg">{fmtInt(b.balance)}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-2 text-xs text-[var(--color-brand-muted)]">
            <p>Account ID · <span className="font-mono text-[var(--color-brand-fg)]">{account.id}</span></p>
            <p>Created · <span className="text-[var(--color-brand-fg)]">{fmtDate(account.createdAt)}</span></p>
            <p>Business · <span className="text-[var(--color-brand-fg)]">{account.businessType ?? '—'}</span></p>
            <p>Industry · <span className="text-[var(--color-brand-fg)]">{account.industry ?? '—'}</span></p>
            <p>Size band · <span className="text-[var(--color-brand-fg)]">{account.sizeBand ?? '—'}</span></p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Tabs defaultValue="ledger">
            <TabsList>
              <TabsTrigger value="ledger">Recent ledger ({recentLedger.length})</TabsTrigger>
              <TabsTrigger value="purchases">Recent purchases ({recentPurchases.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="ledger">
              {recentLedger.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-brand-muted)]">No ledger entries.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>When</TH>
                      <TH>Type</TH>
                      <TH>Tier</TH>
                      <TH>Entry</TH>
                      <TH>Qty</TH>
                      <TH>Reason</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {recentLedger.map((l) => (
                      <TR key={l.id}>
                        <TD className="text-[var(--color-brand-muted)]">{fmtDateTime(l.created_at)}</TD>
                        <TD className="capitalize">{l.token_type}</TD>
                        <TD className="capitalize">{l.tier}</TD>
                        <TD>
                          <Badge tone={l.entry_type === 'credit' ? 'success' : 'warning'} className="capitalize">
                            {l.entry_type}
                          </Badge>
                        </TD>
                        <TD className="font-medium">
                          {l.entry_type === 'debit' ? '−' : '+'}
                          {fmtInt(l.quantity)}
                        </TD>
                        <TD className="text-xs">{l.reason || '—'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="purchases">
              {recentPurchases.length === 0 ? (
                <p className="py-6 text-sm text-[var(--color-brand-muted)]">No purchases.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>When</TH>
                      <TH>Provider</TH>
                      <TH>Status</TH>
                      <TH>Tokens</TH>
                      <TH>Amount</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {recentPurchases.map((p) => (
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
                        <TD>
                          {fmtInt(p.quantity)} · {p.token_type}/{p.tier}
                        </TD>
                        <TD className="font-medium">{fmtMinor(p.amount_minor, p.currency)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
