'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  Hash,
  Loader2,
  PackageOpen,
  Power,
  Radio,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { endpoints, type FirmwareRelease } from '@/lib/api';

/**
 * PENKEEP firmware management — OTA control plane.
 *
 * Three workflows on one page:
 *
 *   1. Upload — POST a .bin with semver version + release notes.
 *      Server computes SHA256 and stores on the private disk.
 *
 *   2. Push — fan out a release to a target set: a list of device
 *      ids, a single farm, or every active device on the channel.
 *      Each device receives a uniquely-signed download URL plus an
 *      HMAC-signed command; both layers gate the install.
 *
 *   3. Deactivate — pull a known-bad release from circulation so no
 *      further downloads succeed. Already-installed devices keep
 *      running it; new pushes are blocked.
 */
export default function FirmwarePage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['firmware-releases'],
    queryFn: () => endpoints.listFirmwareReleases(),
  });

  const releases = useMemo<FirmwareRelease[]>(
    () => data?.releases ?? [],
    [data],
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pushing, setPushing] = useState<FirmwareRelease | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Firmware (OTA)"
        description="Upload versioned PENKEEP firmware builds, then push them over MQTT to a target set of devices. Each device verifies the SHA256 and an HMAC signature before flashing — neither a leaked URL nor a stolen secret alone is enough to install."
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            Upload firmware
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : releases.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="No firmware uploaded yet"
            description="Upload your first .bin to start the OTA pipeline. Builds are addressable by semver — push them to a farm, a device list, or your whole fleet."
            action={
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                Upload firmware
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Version</TH>
                <TH>Channel</TH>
                <TH>Size</TH>
                <TH>SHA256</TH>
                <TH>Uploaded</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {releases.map((r) => (
                <ReleaseRow
                  key={r.id}
                  r={r}
                  onPush={() => setPushing(r)}
                />
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['firmware-releases'] });
            setUploadOpen(false);
          }}
        />
      )}

      {pushing && (
        <PushDialog
          release={pushing}
          onClose={() => setPushing(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Row ─────────────────────────── */

function ReleaseRow({
  r,
  onPush,
}: {
  r: FirmwareRelease;
  onPush: () => void;
}) {
  const qc = useQueryClient();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const deactivate = useMutation({
    mutationFn: () => endpoints.deactivateFirmwareRelease(r.id),
    onSuccess: () => {
      toast.success(`Release ${r.version} deactivated.`);
      qc.invalidateQueries({ queryKey: ['firmware-releases'] });
      setConfirmDeactivate(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not deactivate.'),
  });

  return (
    <>
      <TR>
        <TD>
          <p className="font-mono text-[13px] font-semibold">v{r.version}</p>
          <p className="text-[11.5px] text-[var(--color-brand-muted)]">{r.device_type}</p>
        </TD>
        <TD>
          <ChannelBadge channel={r.channel} />
        </TD>
        <TD className="text-[12px]">{formatBytes(r.file_size)}</TD>
        <TD>
          <span
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--color-brand-muted)]"
            title={r.sha256}
          >
            <Hash className="h-3 w-3" />
            {r.sha256.slice(0, 10)}…
          </span>
        </TD>
        <TD className="text-[12px]">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 text-[var(--color-brand-muted)]" />
            {fmtDate(r.created_at)}
          </span>
        </TD>
        <TD>
          {r.is_active ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="neutral">Deactivated</Badge>
          )}
        </TD>
        <TD className="text-right">
          <div className="inline-flex items-center justify-end gap-1.5">
            {r.is_active && (
              <Button size="sm" onClick={onPush}>
                <Send className="h-3.5 w-3.5" />
                Push
              </Button>
            )}
            {r.is_active && (
              <Button
                size="sm"
                variant="outline"
                className="text-rose-700"
                onClick={() => setConfirmDeactivate(true)}
              >
                <Power className="h-3.5 w-3.5" />
                Deactivate
              </Button>
            )}
          </div>
        </TD>
      </TR>

      {r.release_notes && (
        <TR className="bg-[var(--color-brand-bg)]">
          <TD colSpan={7}>
            <p className="whitespace-pre-wrap text-[12px] text-[var(--color-brand-fg-soft)]">
              {r.release_notes}
            </p>
          </TD>
        </TR>
      )}

      {confirmDeactivate && (
        <TR className="bg-rose-50/60">
          <TD colSpan={7}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                <div>
                  <p className="text-[12.5px] font-bold text-rose-900">
                    Deactivate firmware {r.version}?
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-rose-900">
                    Pushes will be blocked and download URLs return 410 Gone. Devices already
                    running this build keep running it — this does not roll back.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={() => deactivate.mutate()}
                  disabled={deactivate.isPending}
                >
                  {deactivate.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Power className="h-3.5 w-3.5" />
                  )}
                  Yes, deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDeactivate(false)}
                  disabled={deactivate.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </TD>
        </TR>
      )}
    </>
  );
}

/* ─────────────────────────── Upload dialog ─────────────────────────── */

function UploadDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [version, setVersion] = useState('');
  const [channel, setChannel] = useState<'stable' | 'beta' | 'canary'>('stable');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (form: FormData) => endpoints.uploadFirmware(form),
    onSuccess: (res) => {
      toast.success(`Uploaded v${res.release.version} · SHA ${res.release.sha256.slice(0, 8)}…`);
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed.'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error('Select a firmware .bin first.');
      return;
    }
    if (!/^\d+\.\d+\.\d+$/.test(version.trim())) {
      toast.error('Version must be semver (e.g. 3.1.0).');
      return;
    }

    const form = new FormData();
    form.append('version', version.trim());
    form.append('channel', channel);
    if (notes.trim()) form.append('release_notes', notes.trim());
    form.append('file', file);

    upload.mutate(form);
  }

  return (
    <Backdrop onClose={onClose}>
      <Card className="w-full max-w-lg p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Upload firmware</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                Version (semver)
              </label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="3.1.0"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'stable' | 'beta' | 'canary')}
                className="h-10 w-full rounded-lg border border-[var(--color-brand-input-border)] bg-white px-3 text-[13px] text-[var(--color-brand-fg)]"
              >
                <option value="stable">stable</option>
                <option value="beta">beta</option>
                <option value="canary">canary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
              Release notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--color-brand-input-border)] bg-white px-3 py-2 text-[13px] text-[var(--color-brand-fg)]"
              placeholder="What changed in this build?"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
              Firmware .bin
            </label>
            <input
              ref={fileInput}
              type="file"
              accept=".bin,application/octet-stream"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[12.5px] text-[var(--color-brand-fg-soft)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brand-primary)] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:bg-[var(--color-brand-primary-deep)]"
            />
            {file && (
              <p className="mt-1.5 text-[11.5px] text-[var(--color-brand-muted)]">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={upload.isPending || !file}>
              {upload.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload
            </Button>
          </div>
        </form>
      </Card>
    </Backdrop>
  );
}

/* ─────────────────────────── Push dialog ─────────────────────────── */

function PushDialog({
  release,
  onClose,
}: {
  release: FirmwareRelease;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<'device_ids' | 'farm_id' | 'all'>('device_ids');
  const [deviceIds, setDeviceIds] = useState('');
  const [farmId, setFarmId] = useState('');
  const [result, setResult] = useState<{
    attempted: number;
    pushed: number;
    failed: number;
    results: Array<{ device_serial: string; pushed: boolean }>;
  } | null>(null);

  const push = useMutation({
    mutationFn: () => {
      const payload: { target: typeof target; device_ids?: string[]; farm_id?: string } = { target };
      if (target === 'device_ids') {
        payload.device_ids = deviceIds
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (target === 'farm_id') {
        payload.farm_id = farmId.trim();
      }
      return endpoints.pushFirmware(release.id, payload);
    },
    onSuccess: (res) => {
      setResult({
        attempted: res.attempted,
        pushed: res.pushed,
        failed: res.failed,
        results: res.results,
      });
      if (res.pushed === res.attempted) {
        toast.success(`Pushed to all ${res.pushed} device(s).`);
      } else if (res.pushed > 0) {
        toast.warning(`Pushed to ${res.pushed} of ${res.attempted}. ${res.failed} unreachable.`);
      } else {
        toast.error('No device received the push. Are they online?');
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Push failed.'),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (target === 'device_ids' && !deviceIds.trim()) {
      toast.error('Enter at least one device UUID.');
      return;
    }
    if (target === 'farm_id' && !farmId.trim()) {
      toast.error('Enter a farm UUID.');
      return;
    }
    push.mutate();
  }

  return (
    <Backdrop onClose={onClose}>
      <Card className="w-full max-w-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold">
              Push firmware v{release.version}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-[var(--color-brand-muted)]">
              Channel {release.channel} · {formatBytes(release.file_size)} · SHA {release.sha256.slice(0, 10)}…
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--color-brand-muted)] hover:bg-[var(--color-brand-bg)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!result ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <p className="mb-2 text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                Target
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['device_ids', 'farm_id', 'all'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    className={
                      'rounded-lg border px-3 py-2 text-[12px] font-semibold ' +
                      (target === t
                        ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white'
                        : 'border-[var(--color-brand-border)] bg-white text-[var(--color-brand-fg-soft)] hover:bg-[var(--color-brand-bg)]')
                    }
                  >
                    {t === 'device_ids' ? 'Device list' : t === 'farm_id' ? 'Whole farm' : 'All on channel'}
                  </button>
                ))}
              </div>
            </div>

            {target === 'device_ids' && (
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                  Device UUIDs (comma or newline separated)
                </label>
                <textarea
                  value={deviceIds}
                  onChange={(e) => setDeviceIds(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[var(--color-brand-input-border)] bg-white px-3 py-2 font-mono text-[12px] text-[var(--color-brand-fg)]"
                  placeholder="019ec8e6-…, 019ec8e7-…"
                />
              </div>
            )}

            {target === 'farm_id' && (
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--color-brand-fg-soft)]">
                  Farm UUID
                </label>
                <Input
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  placeholder="019e8c87-…"
                  className="font-mono"
                />
              </div>
            )}

            {target === 'all' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
                <AlertTriangle className="mr-1 inline h-4 w-4" />
                This will push v{release.version} to <strong>every active device</strong> on the{' '}
                <strong>{release.channel}</strong> channel. There is no staged rollout.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} disabled={push.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={push.isPending}>
                {push.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Radio className="h-3.5 w-3.5" />
                )}
                Push now
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[var(--color-brand-border)] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[var(--color-brand-muted)]">
                  Attempted
                </p>
                <p className="mt-1 text-[20px] font-bold">{result.attempted}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">Pushed</p>
                <p className="mt-1 text-[20px] font-bold text-emerald-700">{result.pushed}</p>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-rose-700">Failed</p>
                <p className="mt-1 text-[20px] font-bold text-rose-700">{result.failed}</p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--color-brand-border)]">
              <Table>
                <THead>
                  <TR>
                    <TH>Device</TH>
                    <TH className="text-right">Result</TH>
                  </TR>
                </THead>
                <TBody>
                  {result.results.map((row) => (
                    <TR key={row.device_serial}>
                      <TD className="font-mono text-[12px]">{row.device_serial}</TD>
                      <TD className="text-right">
                        {row.pushed ? (
                          <Badge tone="success">
                            <CheckCircle2 className="h-3 w-3" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge tone="danger">Offline</Badge>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <p className="text-[11.5px] text-[var(--color-brand-muted)]">
              Devices marked &ldquo;Offline&rdquo; will not flash this build until they re-attempt MQTT
              and you push again. The same release can be safely pushed multiple times — firmware
              skips already-installed versions.
            </p>

            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>
                <Download className="h-3.5 w-3.5" />
                Done
              </Button>
            </div>
          </div>
        )}
      </Card>
    </Backdrop>
  );
}

/* ─────────────────────────── Pieces ─────────────────────────── */

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === 'beta') return <Badge tone="warning">beta</Badge>;
  if (channel === 'canary') return <Badge tone="danger">canary</Badge>;
  return <Badge tone="success">stable</Badge>;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
