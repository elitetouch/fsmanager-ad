import { formatDistanceToNowStrict, format } from 'date-fns';

/** Tight integer formatter (e.g. 12,450). */
export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

/** Currency in minor units (kobo, pesewa, cents). 200_000 NGN minor → ₦2,000. */
export function fmtMinor(minor: number | null | undefined, currency = 'NGN'): string {
  if (minor === null || minor === undefined || Number.isNaN(minor)) return '—';
  const major = Number(minor) / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

/** "12 May 2026 09:14" — a calm, unambiguous absolute timestamp. */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'd MMM yyyy HH:mm');
  } catch {
    return iso;
  }
}

/** "3 hours ago". For audit feeds and inbox previews. */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

/** "12 May 2026". For dates without times (record dates, etc). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

/** Tiny initial-set generator for avatar fallbacks. */
export function initials(name?: string | null): string {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}
