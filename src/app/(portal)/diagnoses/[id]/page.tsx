'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Check, Loader2, Send, Stethoscope, Syringe, TrendingDown, TrendingUp, UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiErrorMessage, endpoints, type ClinicalBriefDto, type DiagnosisDetailDto,
} from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';

/**
 * One disease check, as a vet sees it.
 *
 * LAYOUT IS TRIAGE ORDER, NOT RECORD ORDER
 * ----------------------------------------
 * The photograph and the clinical history come first; the model's own
 * answer is LAST and hedged. That inversion is deliberate. The model is
 * the least reliable thing on this page — it refuses genuine droppings
 * and has produced confident wrong answers — and a vet who reads
 * "Coccidiosis 94%" before looking at the image is anchored to it.
 * Anchoring a clinician to a bad prior is the specific harm this layout
 * avoids, and it costs nothing to avoid.
 *
 * The clinical brief is the reason this is usable at all. A photograph
 * of droppings on its own is close to useless: bloody droppings at 18
 * days in an unvaccinated flock with rising mortality is coccidiosis
 * until proven otherwise; the same photograph at 3 days, hours after a
 * vaccination, is something else. All of that context already exists in
 * the platform, so the vet should never have to ask for it.
 */
export default function DiagnosisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['diagnosis-review', id],
    queryFn: () => endpoints.showDiagnosisReview(id),
  });

  const d = detail.data?.diagnosis;

  return (
    <div className="space-y-6">
      <Link
        href="/diagnoses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to the queue
      </Link>

      <PageHeader
        title="Disease check"
        description={d ? `Submitted ${fmtDateTime(d.createdAt)}` : undefined}
      />

      {detail.isLoading || !d ? (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Photo id={d.id} hasGradcam={d.hasGradcam} />
            <ClinicalBrief brief={d.clinical} />
            <WhatTheModelSaid d={d} />
          </div>

          <div className="space-y-6">
            {d.consultationRequested && (
              <ReplyPanel
                d={d}
                onDone={() => {
                  void qc.invalidateQueries({ queryKey: ['diagnosis-review', id] });
                  void qc.invalidateQueries({ queryKey: ['diagnosis-reviews'] });
                }}
              />
            )}

            <LabelPanel
              d={d}
              onDone={() => {
                void qc.invalidateQueries({ queryKey: ['diagnosis-review', id] });
                void qc.invalidateQueries({ queryKey: ['diagnosis-reviews'] });
                void qc.invalidateQueries({ queryKey: ['diagnosis-stats'] });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The photograph.
 *
 * Fetched as a blob rather than pointed at by src, because the images
 * sit on a private disk behind an authenticated route — an <img src>
 * carries no Authorization header and would render a broken image.
 *
 * The object URL is revoked on unmount; a vet working through fifty
 * rows would otherwise hold fifty full-size JPEGs in memory.
 */
function Photo({ id, hasGradcam }: { id: string; hasGradcam: boolean }) {
  const [variant, setVariant] = useState<'original' | 'gradcam'>('original');
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    setUrl(null);
    setFailed(false);

    endpoints
      .diagnosisImageBlob(id, variant)
      .then((objectUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        revoked = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [id, variant]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[var(--color-brand-border)] px-4 py-2.5">
        <p className="text-sm font-semibold">The photo</p>
        {hasGradcam && (
          <div className="flex gap-1">
            {(['original', 'gradcam'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={[
                  'rounded-md px-2.5 py-1 text-xs font-medium',
                  variant === v ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700',
                ].join(' ')}
              >
                {v === 'original' ? 'Photo' : 'Where it looked'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-[280px] items-center justify-center bg-neutral-900">
        {failed ? (
          <p className="p-8 text-sm text-neutral-400">This image is no longer available.</p>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Submitted droppings" className="max-h-[520px] w-full object-contain" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        )}
      </div>
    </Card>
  );
}

/**
 * Everything a vet asks in the first two minutes of a consultation.
 *
 * Each block says whether data was RECORDED. "No treatments recorded" is
 * not the same claim as "no treatments given", and a clinician must be
 * able to tell those apart — otherwise the absence of data reads as
 * evidence.
 */
function ClinicalBrief({ brief }: { brief: ClinicalBriefDto }) {
  if (!brief.cycleLinked) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold">No cycle attached</p>
        <p className="mt-1 text-sm text-neutral-600">
          The farmer submitted this photo without linking it to a flock, so there is no
          recorded history. The photograph is all we have.
        </p>
      </Card>
    );
  }

  const { cycle, mortality, vaccinations, treatments, intake } = brief;

  return (
    <Card className="space-y-5 p-4">
      <div>
        <p className="text-sm font-semibold">The flock</p>
        <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Age" value={cycle?.ageDays != null ? `${cycle.ageDays} days` : '—'} />
          <Stat label="Breed" value={cycle?.breed ?? '—'} />
          <Stat label="Placed" value={fmtInt(cycle?.placedBirds)} />
          <Stat label="Now" value={cycle?.currentBirds != null ? fmtInt(cycle.currentBirds) : '—'} />
        </dl>
      </div>

      <div>
        <p className="text-sm font-semibold">Mortality</p>
        {mortality?.recorded ? (
          <>
            <dl className="mt-2 grid grid-cols-3 gap-3">
              <Stat label="Last 7 days" value={fmtInt(mortality.last7Days)} />
              <Stat label="Week before" value={fmtInt(mortality.previous7Days)} />
              <Stat
                label="Cycle total"
                value={`${fmtInt(mortality.total)}${
                  mortality.totalPercent != null ? ` (${mortality.totalPercent}%)` : ''
                }`}
              />
            </dl>
            {/* The trend is the line a vet triages on. Stated outright
                rather than left as two numbers to compare mentally. */}
            {mortality.trend === 'rising' && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-sm font-medium text-red-700">
                <TrendingUp className="h-3.5 w-3.5" />
                Rising
              </p>
            )}
            {mortality.trend === 'falling' && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-600">
                <TrendingDown className="h-3.5 w-3.5" />
                Falling
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">No mortality recorded for this cycle.</p>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold">Vaccination</p>
        {vaccinations?.recorded ? (
          <div className="mt-2 space-y-3">
            {(vaccinations.missed?.length ?? 0) > 0 && (
              <div>
                {/* Missed doses are the highest-value field on this page.
                    A flock that missed its Gumboro dose and is now
                    presenting with bloody droppings is a different
                    conversation from one that did not. */}
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">Missed</p>
                <ul className="mt-1 space-y-1">
                  {vaccinations.missed?.map((v, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Syringe className="h-3.5 w-3.5 shrink-0 text-red-600" />
                      <span>{v.name}</span>
                      {v.diseaseTarget && (
                        <span className="text-neutral-500">— {v.diseaseTarget}</span>
                      )}
                      <span className="text-neutral-400">day {v.ageDays}</span>
                      {v.critical && <Badge tone="danger">critical</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(vaccinations.given?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Given</p>
                <ul className="mt-1 space-y-1">
                  {vaccinations.given?.map((v, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-neutral-700">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{v.name}</span>
                      <span className="text-neutral-400">{v.completedAt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(vaccinations.skipped?.length ?? 0) > 0 && (
              <div>
                {/* Kept apart from "missed": a deliberate skip with a
                    reason is a decision, not an omission. */}
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Deliberately skipped
                </p>
                <ul className="mt-1 space-y-1">
                  {vaccinations.skipped?.map((v, i) => (
                    <li key={i} className="text-sm text-neutral-600">
                      {v.name}
                      {v.skipReason && <span className="text-neutral-400"> — {v.skipReason}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">No vaccination schedule on this cycle.</p>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold">Medication, last 30 days</p>
        {treatments?.recorded ? (
          <ul className="mt-1 space-y-1">
            {treatments.items?.map((t, i) => (
              <li key={i} className="text-sm text-neutral-700">
                <span className="font-medium">{t.product ?? t.type ?? 'Unnamed'}</span>
                {t.dosage && <span className="text-neutral-500"> — {t.dosage}</span>}
                <span className="text-neutral-400"> ({t.date})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">No medication recorded in the last 30 days.</p>
        )}
      </div>

      {intake?.recorded && (
        <div>
          {/* Off-feed and off-water often precede any visible change in
              droppings — a normal-looking photo alongside a 40% water
              drop is a very different situation from the photo alone. */}
          <p className="text-sm font-semibold">Feed and water</p>
          <dl className="mt-2 grid grid-cols-2 gap-3">
            <Stat
              label="Feed, 7d vs prior"
              value={`${intake.feedLast7} vs ${intake.feedPrevious7} ${intake.feedUnit ?? ''}`}
            />
            <Stat
              label="Water, 7d vs prior"
              value={`${intake.waterLast7} vs ${intake.waterPrevious7} ${intake.waterUnit ?? ''}`}
            />
          </dl>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

/**
 * The model's answer, last and hedged. See the page docblock.
 *
 * The out-of-distribution scores are shown WITH the thresholds they were
 * judged against, because the thresholds move and a bare number becomes
 * uninterpretable once they do. They are the whole reason a refusal can
 * be re-judged offline after a retune.
 */
function WhatTheModelSaid({ d }: { d: DiagnosisDetailDto }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold">What the model said</p>

      <p className="mt-2 text-sm">
        {d.predictedClass ? (
          <>
            <span className="font-medium">{d.predictedClass}</span>
            {d.confidence !== null && (
              <span className="text-neutral-500"> · {d.confidence}% confidence</span>
            )}
          </>
        ) : (
          <span className="text-neutral-600">
            No result — {d.inconclusiveReason ?? 'rejected by the guards'}
          </span>
        )}
      </p>

      {Object.keys(d.scores).length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(d.scores).map(([label, score]) => (
            <Stat key={label} label={label} value={String(score)} />
          ))}
        </dl>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-brand-border)] pt-3 sm:grid-cols-4">
        <Stat
          label="Energy"
          value={d.ood.energy !== null ? `${d.ood.energy} / ${d.ood.energyThreshold}` : '—'}
        />
        <Stat
          label="Distance"
          value={d.ood.distance !== null ? `${d.ood.distance} / ${d.ood.distanceThreshold}` : '—'}
        />
        <Stat label="Nearest class" value={d.ood.nearestCentroid ?? '—'} />
        <Stat label="Model" value={d.modelVersion ?? '—'} />
      </div>

      {d.userFeedback && (
        <p className="mt-3 text-sm text-neutral-600">
          Farmer marked this <span className="font-medium">{d.userFeedback}</span>
          {d.userReportedDisease && <> and said it was {d.userReportedDisease}</>}.
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        The model is in beta and unreliable on real farm photos — it refuses genuine droppings
        and has produced confident wrong answers. Treat the above as a hint, not a finding.
      </p>
    </Card>
  );
}

/**
 * Record what the droppings actually showed.
 *
 * `not_droppings` and `unclear` are first-class choices, not escapes.
 * The first is the negative class a real "is this a dropping?" gate
 * needs and the only honest source of them. The second marks where a
 * qualified vet could not tell from a photograph, which bounds what any
 * model can achieve and keeps those rows out of accuracy figures.
 */
function LabelPanel({ d, onDone }: { d: DiagnosisDetailDto; onDone: () => void }) {
  const [label, setLabel] = useState<string | null>(d.vetLabel);
  const [notes, setNotes] = useState(d.vetNotes ?? '');

  const save = useMutation({
    mutationFn: () => endpoints.reviewDiagnosis(d.id, label as string, notes || undefined),
    onSuccess: () => {
      toast.success('Label recorded.');
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save the label.')),
  });

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold">What was it actually?</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          This becomes training data for the next model.
        </p>
      </div>

      <div className="grid gap-1.5">
        {d.allowedLabels.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setLabel(option)}
            className={[
              'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
              label === option
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                : 'border-[var(--color-brand-border)] bg-white hover:bg-neutral-50',
            ].join(' ')}
          >
            {option === 'not_droppings'
              ? 'Not droppings at all'
              : option === 'unclear'
                ? 'Cannot tell from this photo'
                : option}
          </button>
        ))}
      </div>

      <div>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did the model miss? Internal only."
        />
        {/* Said explicitly, because a vet who thinks this reaches the
            farmer will sanitise it — and a sanitised note is useless
            for working out why the model failed. */}
        <p className="mt-1 text-xs text-neutral-500">
          Internal. The farmer never sees this.
        </p>
      </div>

      <Button
        className="w-full"
        disabled={!label || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Stethoscope className="h-4 w-4" />
        )}
        {d.vetLabel ? 'Update label' : 'Save label'}
      </Button>

      {d.vetReviewedAt && (
        <p className="text-xs text-neutral-500">
          Reviewed by {d.vetReviewedBy ?? 'unknown'} on {fmtDateTime(d.vetReviewedAt)}
        </p>
      )}
    </Card>
  );
}

/**
 * Answer the farmer who asked for a consultation.
 *
 * Separate from the label because they are separate jobs: a vet may
 * label a hundred archive images without writing to anyone, and may
 * reply before they are certain enough to commit a label. Merging them
 * would make every label demand customer-facing prose — which is how
 * the labelling work stops happening.
 */
function ReplyPanel({ d, onDone }: { d: DiagnosisDetailDto; onDone: () => void }) {
  const [reply, setReply] = useState('');

  const send = useMutation({
    mutationFn: () => endpoints.replyToDiagnosis(d.id, reply),
    onSuccess: () => {
      toast.success('Sent to the farmer.');
      setReply('');
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not send the reply.')),
  });

  if (d.vetReply) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-semibold">Replied to the farmer</p>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{d.vetReply}</p>
        {d.vetRepliedAt && (
          <p className="mt-2 text-xs text-neutral-500">{fmtDateTime(d.vetRepliedAt)}</p>
        )}
      </Card>
    );
  }

  return (
    <Card className="space-y-3 border-red-200 bg-red-50/40 p-4">
      <div>
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-red-600" />
          <p className="text-sm font-semibold text-red-900">This farmer is waiting</p>
        </div>
        <p className="mt-0.5 text-xs text-red-800">
          They asked for a vet {d.consultationRequestedAt ? fmtDateTime(d.consultationRequestedAt) : ''}.
        </p>
      </div>

      <Textarea
        rows={7}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="What should they do? Line breaks are kept, so number the steps if that helps."
      />

      <Button
        className="w-full"
        disabled={reply.trim().length < 10 || send.isPending}
        onClick={() => send.mutate()}
      >
        {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send to the farmer
      </Button>

      <p className="text-xs text-neutral-600">
        They get a notification and read this in the app. Write it to them, not to us.
      </p>
    </Card>
  );
}
