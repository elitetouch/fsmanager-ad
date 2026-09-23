'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, Cpu, HardDrive, Layers, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { endpoints, type ServerHealthDto } from '@/lib/api';
import { fmtDateTime, fmtInt } from '@/lib/format';

/**
 * Is the box about to fall over?
 *
 * WHY THIS PAGE IS SO NARROW
 * --------------------------
 * Production is a 3.8GB / 2-core VPS running PostgreSQL, php-fpm, queue
 * workers, an MQTT daemon AND a PyTorch process that holds roughly 1.5GB
 * resident once a model is loaded. There is no headroom. The failure
 * mode is not gradual slowdown — it is the kernel OOM-killer picking a
 * victim, usually whatever allocated last, which here is Postgres or the
 * inference service.
 *
 * So this is not a metrics dashboard. Every number shown has either
 * already caused an incident on this box or is one allocation away from
 * causing one. Anything else would dilute the two or three readings that
 * actually predict an outage.
 *
 * Polls every 30 seconds. Fast enough to catch a climb, slow enough that
 * the health check is not itself a load.
 */
export default function ServerHealthPage() {
  const health = useQuery({
    queryKey: ['server-health'],
    queryFn: () => endpoints.serverHealth(),
    refetchInterval: 30_000,
  });

  const h = health.data?.health;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server health"
        description="Memory, disk and the inference service. Refreshes every 30 seconds."
      />

      {health.isLoading || !h ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Verdict health={h} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MemoryCard checks={h.checks} />
            <InferenceCard inference={h.checks.inference} />
            <DiskCard checks={h.checks} />
            <LoadCard checks={h.checks} />
            <QueueCard checks={h.checks} />
            <StorageCard checks={h.checks} />
          </div>

          <p className="text-xs text-neutral-500">Captured {fmtDateTime(h.capturedAt)}</p>
        </>
      )}
    </div>
  );
}

function Verdict({ health }: { health: ServerHealthDto }) {
  const map = {
    ok: {
      icon: CheckCircle2,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      title: 'Healthy',
      body: 'Nothing is close to a limit.',
    },
    warning: {
      icon: AlertTriangle,
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      title: 'Watch this',
      body: 'Something is near a threshold. Look at the red figures below.',
    },
    critical: {
      icon: XCircle,
      tone: 'border-red-200 bg-red-50 text-red-900',
      title: 'About to fail',
      body: 'A limit is close enough that the next allocation may be killed.',
    },
  } as const;

  const v = map[health.status];
  const Icon = v.icon;

  return (
    <Card className={`flex items-start gap-3 border p-4 ${v.tone}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">{v.title}</p>
        <p className="mt-0.5 text-sm">{v.body}</p>
      </div>
    </Card>
  );
}

/**
 * System memory.
 *
 * Headlines AVAILABLE, not used, and the distinction is not pedantry.
 * MemAvailable is the kernel's own estimate and accounts for reclaimable
 * page cache, which on a database box is most of what "used" counts.
 * Showing 90% used on a perfectly healthy server is how a health page
 * teaches people to ignore it.
 */
function MemoryCard({ checks }: { checks: ServerHealthDto['checks'] }) {
  const m = checks.memory;
  const swap = checks.swap;

  if (m.available !== true) {
    return <Unavailable title="Memory" reason="Not a Linux host — /proc is unavailable." />;
  }

  const availableMb = Number(m.availableMb ?? 0);
  const warnBelow = Number(m.warnBelowMb ?? 600);
  const criticalBelow = Number(m.criticalBelowMb ?? 300);

  const tone =
    availableMb < criticalBelow
      ? 'text-red-600'
      : availableMb < warnBelow
        ? 'text-amber-600'
        : 'text-neutral-900';

  return (
    <Card className="p-4">
      <Header icon={Cpu} title="Memory" />
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{fmtInt(availableMb)} MB</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        available of {fmtInt(Number(m.totalMb ?? 0))} MB · warn below {fmtInt(warnBelow)}
      </p>
      {swap.available === true && Number(swap.usedMb ?? 0) > 0 && (
        // Swap in use is the warning light, not the problem — it means
        // the working set no longer fits, and users feel it as "the app
        // got slow" long before anything is killed.
        <p className="mt-2 text-xs font-medium text-amber-700">
          Swapping: {fmtInt(Number(swap.usedMb))} MB in use
        </p>
      )}
    </Card>
  );
}

/**
 * The Python inference service.
 *
 * The cgroup figure is the most useful number on this page. The unit
 * runs with MemoryMax=1800M, so systemd kills it at that line no matter
 * how much RAM the box has spare — meaning healthy system memory tells
 * you nothing about whether disease check is about to start failing.
 */
function InferenceCard({ inference }: { inference: ServerHealthDto['checks']['inference'] }) {
  const mem = inference.memory;
  const pct = mem?.usedPercent != null ? Number(mem.usedPercent) : null;

  const tone = pct === null ? '' : pct >= 92 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : '';

  return (
    <Card className="p-4">
      <Header icon={Activity} title="Disease check service" />

      <div className="mt-1 flex items-center gap-2">
        {inference.enabled === false ? (
          <Badge tone="muted">Disabled</Badge>
        ) : inference.reachable ? (
          <Badge tone="success">Answering</Badge>
        ) : (
          <Badge tone="danger">Not answering</Badge>
        )}
        {inference.responseMs != null && (
          <span className="text-xs text-neutral-500">{inference.responseMs} ms</span>
        )}
      </div>

      {mem?.available === true ? (
        <p className={`mt-2 text-sm font-medium ${tone}`}>
          {fmtInt(Number(mem.usedMb ?? 0))} MB
          {mem.limitMb != null && <> of {fmtInt(Number(mem.limitMb))} MB limit</>}
          {pct !== null && <span className="text-neutral-500"> · {pct}%</span>}
        </p>
      ) : (
        <p className="mt-2 text-xs text-neutral-500">Memory limit not readable from here.</p>
      )}

      {inference.error && (
        <p className="mt-2 break-words text-xs text-red-600">{inference.error}</p>
      )}
    </Card>
  );
}

function DiskCard({ checks }: { checks: ServerHealthDto['checks'] }) {
  const d = checks.disk;

  if (d.available !== true) {
    return <Unavailable title="Disk" reason="Could not read the storage partition." />;
  }

  const pct = Number(d.usedPercent ?? 0);
  const tone = pct >= 94 ? 'text-red-600' : pct >= 85 ? 'text-amber-600' : 'text-neutral-900';

  return (
    <Card className="p-4">
      <Header icon={HardDrive} title="Disk" />
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{pct}%</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        {d.freeGb} GB free of {d.totalGb} GB
      </p>
    </Card>
  );
}

/**
 * Load, normalised per core.
 *
 * Raw load average means nothing without the core count — 2.0 saturates
 * this 2-core box and is idle on a 16-core one.
 */
function LoadCard({ checks }: { checks: ServerHealthDto['checks'] }) {
  const l = checks.load;

  if (l.available !== true) {
    return <Unavailable title="Load" reason="Load average is unavailable on this host." />;
  }

  const perCore = l.perCore != null ? Number(l.perCore) : null;
  const tone = perCore === null ? '' : perCore >= 2 ? 'text-red-600' : perCore >= 1 ? 'text-amber-600' : '';

  return (
    <Card className="p-4">
      <Header icon={Activity} title="Load" />
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{perCore ?? '—'}</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        per core · {l.one}, {l.five}, {l.fifteen} over {fmtInt(Number(l.cores ?? 1))} core(s)
      </p>
    </Card>
  );
}

/**
 * Queue depth.
 *
 * The leading indicator for memory pressure here: every queued job is a
 * worker that will allocate. A backlog growing while memory falls is the
 * shape of the incident this page exists to catch.
 */
function QueueCard({ checks }: { checks: ServerHealthDto['checks'] }) {
  const q = checks.queue;

  if (q.available !== true) {
    return <Unavailable title="Queue" reason="Could not read the jobs table." />;
  }

  const oldest = q.oldestPendingSeconds != null ? Number(q.oldestPendingSeconds) : null;

  return (
    <Card className="p-4">
      <Header icon={Layers} title="Queue" />
      <p className="mt-1 text-2xl font-bold">{fmtInt(Number(q.pending ?? 0))}</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        waiting
        {oldest !== null && oldest > 300 && (
          <span className="text-amber-700"> · oldest {Math.round(oldest / 60)} min</span>
        )}
      </p>
      {Number(q.failedLast24h ?? 0) > 0 && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {fmtInt(Number(q.failedLast24h))} failed in 24h
        </p>
      )}
    </Card>
  );
}

/**
 * How much disk the disease-check images are consuming.
 *
 * Every check stores a JPEG forever by design — they are the training
 * set. "Forever" on a small VPS needs a number attached to it, visible
 * before the partition fills rather than after.
 */
function StorageCard({ checks }: { checks: ServerHealthDto['checks'] }) {
  const s = checks.diagnosisStorage;

  if (s.available !== true) {
    return <Unavailable title="Stored photos" reason="Could not count stored images." />;
  }

  return (
    <Card className="p-4">
      <Header icon={HardDrive} title="Stored photos" />
      <p className="mt-1 text-2xl font-bold">{fmtInt(Number(s.images ?? 0))}</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        kept for retraining · {fmtInt(Number(s.last7Days ?? 0))} this week
      </p>
    </Card>
  );
}

function Header({ icon: Icon, title }: { icon: typeof Activity; title: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-neutral-400" />
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
    </div>
  );
}

/**
 * Says the reading is missing rather than showing a zero.
 *
 * A health page that invents numbers where it has none trains people to
 * distrust the ones it does have.
 */
function Unavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <Card className="p-4">
      <Header icon={Activity} title={title} />
      <p className="mt-1 text-sm text-neutral-400">Unavailable</p>
      <p className="mt-0.5 text-xs text-neutral-500">{reason}</p>
    </Card>
  );
}
