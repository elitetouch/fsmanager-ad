'use client';

import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { endpoints } from '@/lib/api';
import { readToken } from '@/lib/auth';

interface Props {
  /** Backend resource key — matches /admin/exports/{resource}. */
  resource:
    | 'users'
    | 'farms'
    | 'accounts'
    | 'token-ledger'
    | 'token-purchases'
    | 'audit-logs';
  /** Same filters as the page's list endpoint — empty entries dropped. */
  filters: Record<string, string | number | undefined>;
  /** Optional label override; defaults to "Export CSV". */
  label?: string;
}

/**
 * Streamed-download trigger. Calls the streaming endpoint via fetch
 * with the bearer token, turns the response into a blob URL, and
 * triggers a download via a synthetic <a> click. This avoids leaking
 * the token in a `?token=` query parameter and keeps the URL out of
 * server access logs.
 */
export function ExportButton({ resource, filters, label = 'Export CSV' }: Props) {
  async function handleClick() {
    const url = endpoints.exportUrl(resource, filters);
    const token = readToken();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}`, Accept: 'text/csv' } : { Accept: 'text/csv' },
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const blob = await res.blob();
      // Derive filename from Content-Disposition header when present.
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? `${resource}.csv`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
