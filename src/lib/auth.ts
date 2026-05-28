/**
 * Sanctum token storage for the admin portal.
 *
 * We store the bearer token in `localStorage` keyed by APP_NAME so that two
 * portals on the same host (e.g. tenant + admin under different paths) do
 * not stomp on each other.
 *
 * The token is a long-lived Sanctum personal-access-token. Per BR-06 in the
 * BRD, admin tokens cannot authenticate tenant routes, so there is no risk
 * of cross-surface leakage even if the token escapes localStorage.
 */
const KEY_TOKEN = 'fsmanager.admin.token';
const KEY_ADMIN = 'fsmanager.admin.user';

export type StoredAdmin = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support' | 'analyst' | 'read_only';
  status: string;
  capabilities?: string[];
};

export function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY_TOKEN);
}

export function writeToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY_TOKEN, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY_TOKEN);
  window.localStorage.removeItem(KEY_ADMIN);
}

export function readAdmin(): StoredAdmin | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY_ADMIN);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAdmin;
  } catch {
    return null;
  }
}

export function writeAdmin(admin: StoredAdmin): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY_ADMIN, JSON.stringify(admin));
}

/**
 * Centralised capability check. Mirrors RequireAdminPermission on the API
 * side: role-default OR per-admin permission override OR a `support.*`
 * style wildcard.
 *
 * We use this in the UI to hide buttons the current admin cannot fire. The
 * API is still the source of truth — never assume the UI check is
 * sufficient.
 */
export function adminCan(admin: StoredAdmin | null, permission: string): boolean {
  if (!admin) return false;
  if (admin.status !== 'active') return false;
  if (admin.role === 'super_admin' || admin.role === 'admin') return true;

  const caps = admin.capabilities ?? [];
  for (const cap of caps) {
    if (cap === '*' || cap === permission) return true;
    if (cap.endsWith('.*') && permission.startsWith(cap.slice(0, -2) + '.')) return true;
  }
  return false;
}
