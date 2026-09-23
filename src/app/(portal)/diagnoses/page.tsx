'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Check, Stethoscope, UserRound, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { endpoints, type DiagnosisReviewDto } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';

/**
 * The veterinary review queue.
 *
 * WHAT THIS IS FOR
 * ----------------
 * The disease-check model was trained on a public dataset of small
 * droppings photographed from standing height on soil and litter. Real
 * submissions are close-ups on concrete, taken on phones, in whatever
 * light the pen has. The measured result is that genuine droppings get
 * refused, and — before the guards were tightened — a photograph of
 * groceries was diagnosed as coccidiosis at full confidence.
 *
 * Threshold tuning cannot fix that, because the thresholds are derived
 * from the same mismatched distribution. A few hundred real photographs
 * carrying labels a vet stands behind can. This screen is where those
 * get made.
 *
 * TWO JOBS, ONE QUEUE
 * -------------------
 * Most rows are training data and can wait. A few are farmers who asked
 * for a human and are waiting on an answer. Those sort to the top
 * regardless of age and are the only thing badged loudly, because they
 * are the only rows with a person on the other end.
 */
const TABS = [
  { key: 'awaiting', label: 'Waiting on us' },
  { key: 'pending', label: 'To review' },
  { key: 'reviewed', label: 'Reviewed' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function DiagnosesPage() {
  const [tab, setTab] = useState<TabKey>('awaiting');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const params =
    tab === 'awaiting'
      ? { page, per_page: perPage, status: 'all', awaiting_reply: true }
      : { page, per_page: perPage, status: tab };

  const list = useQuery({
    queryKey: ['diagnosis-reviews', { tab, page }],
    queryFn: () => endpoints.listDiagnosisReviews(params),
  });

  const stats = useQuery({
    queryKey: ['diagnosis-stats'],
    queryFn: () => endpoints.diagnosisStats(),
  });

  const rows = list.data?.diagnoses ?? [];
  const meta = list.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disease checks"
        description="Confirm what each photo actually showed. These labels are what the next model is trained on."
      />

      {stats.data ? <StatsRow stats={stats.data.stats} /> : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count =
            t.key === 'awaiting'
              ? meta?.awaitingReplyTotal
              : t.key === 'pending'
                ? meta?.pendingTotal
                : undefined;

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
              ].join(' ')}
            >
              {t.label}
              {count !== undefined && count > 0 && (
                <span
                  className={[
                    'ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                    tab === t.key ? 'bg-white/25' : 'bg-neutral-300 text-neutral-800',
                  ].join(' ')}
                >
                  {fmtInt(count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden p-0">
        {list.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title={tab === 'awaiting' ? 'Nobody is waiting' : 'Nothing here'}
            description={
              tab === 'awaiting'
                ? 'Every farmer who asked for a vet has had a reply.'
                : 'No checks match this filter yet.'
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Submitted</TH>
                <TH>Model said</TH>
                <TH>Farmer</TH>
                <TH>Vet label</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <ReviewRow key={row.id} row={row} />
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {meta && meta.lastPage > 1 && (
        <Pagination
          page={meta.currentPage}
          lastPage={meta.lastPage}
          total={meta.total}
          perPage={meta.perPage}
          onChange={setPage}
        />
      )}
    </div>
  );
}

function ReviewRow({ row }: { row: DiagnosisReviewDto }) {
  return (
    <TR className="cursor-pointer hover:bg-neutral-50">
      <TD>
        <Link href={`/diagnoses/${row.id}`} className="block">
          {fmtDateTime(row.createdAt)}
        </Link>
      </TD>

      <TD>
        <Link href={`/diagnoses/${row.id}`} className="block">
          {row.predictedClass ? (
            <span className="font-medium">
              {row.predictedClass}
              {row.confidence !== null && (
                <span className="text-neutral-500"> · {Math.round(row.confidence)}%</span>
              )}
            </span>
          ) : (
            // A refusal is not an error and must not read as one. It is
            // often the correct outcome, and the tightening of these
            // guards is exactly what this queue measures.
            <span className="text-neutral-500">Refused</span>
          )}
        </Link>
      </TD>

      <TD>
        <Link href={`/diagnoses/${row.id}`} className="block">
          {row.userFeedback === 'disagreed' ? (
            <Badge tone="warning">Disagreed</Badge>
          ) : row.userFeedback === 'agreed' ? (
            <span className="text-neutral-500">Agreed</span>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
        </Link>
      </TD>

      <TD>
        <Link href={`/diagnoses/${row.id}`} className="block">
          {row.vetLabel ? (
            <span className="flex items-center gap-1.5">
              {/* Agreement shown as an icon, not a word: the eye finds a
                  run of crosses down this column far faster than it
                  reads "no" eleven times. */}
              {row.agreesWithModel === true ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : row.agreesWithModel === false ? (
                <X className="h-3.5 w-3.5 text-red-600" />
              ) : null}
              {row.vetLabel}
            </span>
          ) : (
            <span className="text-neutral-400">Not reviewed</span>
          )}
        </Link>
      </TD>

      <TD>
        <Link href={`/diagnoses/${row.id}`} className="block">
          {row.awaitingVetReply ? (
            <Badge tone="danger">
              <UserRound className="mr-1 h-3 w-3" />
              Farmer waiting
            </Badge>
          ) : row.vetRepliedAt ? (
            <span className="text-neutral-500">Replied</span>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
        </Link>
      </TD>
    </TR>
  );
}

/**
 * How the model is actually doing.
 *
 * Measured against vet labels ONLY, over rows where agreement is
 * defined. Unreviewed rows and `unclear` ones are excluded rather than
 * assumed correct — an accuracy figure that quietly counts the
 * unreviewed majority as right is worse than none, because it gets
 * quoted in meetings.
 *
 * The two failure counts are kept apart because they need opposite
 * fixes: refusing a real dropping means the guards are too tight,
 * accepting a non-dropping means they are too loose. A single accuracy
 * number hides which way to move.
 */
function StatsRow({
  stats,
}: {
  stats: {
    reviewed: number;
    pending: number;
    scorable: number;
    accuracy: number | null;
    refusedButReal: number;
    acceptedButNotDroppings: number;
    confirmedNegatives: number;
  };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Agrees with vet
        </p>
        <p className="mt-1 text-2xl font-bold">
          {stats.accuracy === null ? '—' : `${stats.accuracy}%`}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          over {fmtInt(stats.scorable)} scorable
        </p>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Left to review
        </p>
        <p className="mt-1 text-2xl font-bold">{fmtInt(stats.pending)}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{fmtInt(stats.reviewed)} done</p>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Wrongly refused
        </p>
        <p className="mt-1 text-2xl font-bold text-amber-600">{fmtInt(stats.refusedButReal)}</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          real droppings the guards rejected
        </p>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Confirmed negatives
        </p>
        <p className="mt-1 text-2xl font-bold">{fmtInt(stats.confirmedNegatives)}</p>
        {/* The gate cannot be built honestly until this is in the
            hundreds. Showing the number makes that concrete rather than
            a promise that keeps slipping. */}
        <p className="mt-0.5 text-xs text-neutral-500">
          {stats.acceptedButNotDroppings > 0 && (
            <span className="text-red-600">
              {fmtInt(stats.acceptedButNotDroppings)} wrongly accepted ·{' '}
            </span>
          )}
          for the &ldquo;is this a dropping?&rdquo; gate
        </p>
      </Card>
    </div>
  );
}
