/**
 * Permission catalogue + role-default resolution for the admin portal.
 *
 * Source of truth on the backend side:
 *   - app/Models/AdminUser.php       — rolePermissions()
 *   - app/Http/Middleware/RequireAdminPermission.php
 *
 * We mirror both here so the <PermissionPicker /> can show admins:
 *   1. Every available capability key, grouped by module, with a
 *      human-readable label + tooltip-style description.
 *   2. Which of those keys are ALREADY granted by the chosen role
 *      (so the admin can't accidentally "un-grant" them via overrides —
 *      role grants are additive on the backend).
 *   3. Which keys the admin is choosing to grant as per-admin overrides
 *      on top of the role default.
 *
 * Keep this file in sync with the backend whenever a new permission key
 * is introduced. If they drift, the worst outcome is the picker hiding a
 * capability the backend supports — the API still enforces every key.
 */

export type PermissionDef = {
  /** Canonical dot-namespaced permission key, e.g. "users.suspend". */
  key: string;
  /** Short human-friendly label shown next to the checkbox. */
  label: string;
  /** One-line explanation shown below the label in muted text. */
  description: string;
};

export type PermissionGroup = {
  /** Module name shown as the group header. */
  name: string;
  /** Brief description of the module shown under the header. */
  description: string;
  items: PermissionDef[];
};

/**
 * Canonical role names as used on the backend.
 */
export type AdminRole = 'super_admin' | 'admin' | 'support' | 'analyst' | 'read_only';

/**
 * Permission key → metadata, grouped by module for display.
 */
export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    name: 'Dashboard & analytics',
    description: 'Read-only insight surfaces.',
    items: [
      {
        key: 'dashboard.view',
        label: 'View dashboard',
        description: 'KPI snapshot, growth, engagement, support inbox summary.',
      },
      {
        key: 'segmentation.view',
        label: 'View segmentation',
        description: 'Slice users / farms / flocks by country, state, breed, mortality.',
      },
      {
        key: 'audit.view',
        label: 'View audit log',
        description: 'Read the append-only feed of admin actions across the platform.',
      },
    ],
  },
  {
    name: 'Tenant users',
    description: 'Search, suspend, verify, and annotate farmer accounts.',
    items: [
      {
        key: 'users.view',
        label: 'View users',
        description: 'Browse, search, filter and open the profile of any tenant user.',
      },
      {
        key: 'users.suspend',
        label: 'Suspend / unsuspend users',
        description: 'Revoke a user’s sessions and flag the account, or restore it.',
      },
      {
        key: 'users.verify_email',
        label: 'Manually verify email',
        description: 'Stamp email_verified_at when a tenant can’t complete the OTP flow.',
      },
      {
        key: 'users.note',
        label: 'Add notes to users',
        description: 'Attach internal notes (pinned or normal) to a tenant profile.',
      },
    ],
  },
  {
    name: 'Farms',
    description: 'Operational surface for every farm on the platform.',
    items: [
      {
        key: 'farms.view',
        label: 'View farms',
        description: 'List, search, filter, and open the dossier of any farm.',
      },
      {
        key: 'farms.archive',
        label: 'Archive / restore farms',
        description: 'Cascade-archive pens + active flocks, or undo it.',
      },
      {
        key: 'farms.note',
        label: 'Add notes to farms',
        description: 'Attach internal notes to a farm’s dossier.',
      },
    ],
  },
  {
    name: 'Accounts',
    description: 'Billing units that own one or many farms.',
    items: [
      {
        key: 'accounts.view',
        label: 'View accounts',
        description: 'Browse and inspect account balances, ledger, and purchase history.',
      },
    ],
  },
  {
    name: 'Tokens & billing',
    description: 'Pre-paid credits, ledger, manual corrections, and price changes.',
    items: [
      {
        key: 'tokens.view',
        label: 'View tokens',
        description: 'Balances, ledger, prices, purchases — read-only surface.',
      },
      {
        key: 'tokens.adjust',
        label: 'Adjust token balances',
        description: 'Manual credit / debit with required reason. Writes to the ledger.',
      },
      {
        key: 'tokens.manual_purchase',
        label: 'Record offline payments',
        description: 'Bank transfer / cash / USSD / POS — counts as revenue.',
      },
      {
        key: 'tokens.price.manage',
        label: 'Manage token prices',
        description: 'Activate a new unit price; the previous one is deactivated atomically.',
      },
    ],
  },
  {
    name: 'Support inbox',
    description: 'In-house messaging with tenants.',
    items: [
      {
        key: 'support.view',
        label: 'View support threads',
        description: 'Read every thread including internal hand-off notes.',
      },
      {
        key: 'support.reply',
        label: 'Reply to threads',
        description: 'Post messages on behalf of the team. Internal-only or to tenant.',
      },
      {
        key: 'support.assign',
        label: 'Assign threads',
        description: 'Claim threads or hand them off to another admin.',
      },
      {
        key: 'support.status',
        label: 'Change thread status',
        description: 'Move threads between open, pending, resolved, closed.',
      },
    ],
  },
  {
    name: 'Administration',
    description: 'Platform-staff lifecycle. Restricted by default.',
    items: [
      {
        key: 'admin_users.create',
        label: 'Create new admin users',
        description: 'Provision platform staff with a role + optional overrides. Super-admin scope.',
      },
    ],
  },
];

/**
 * Role-default capability list — mirrors AdminUser::rolePermissions() on
 * the backend exactly. If you add or change a key here, change it there
 * too (or the picker will drift from reality).
 *
 * "*" means "everything"; a key ending in ".*" is a wildcard suffix
 * (matches any key starting with that prefix).
 */
export const ROLE_DEFAULTS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  admin: ['*'],
  support: [
    'users.view',
    'users.note',
    'users.suspend',
    'farms.view',
    'farms.note',
    'accounts.view',
    'tokens.view',
    'support.*',
    'audit.view',
    'dashboard.view',
    'segmentation.view',
  ],
  analyst: [
    'users.view',
    'farms.view',
    'accounts.view',
    'tokens.view',
    'dashboard.view',
    'segmentation.view',
    'audit.view',
    'exports.run',
  ],
  read_only: [
    'users.view',
    'farms.view',
    'accounts.view',
    'tokens.view',
    'dashboard.view',
    'segmentation.view',
    'support.view',
    'audit.view',
  ],
};

/**
 * Does the given role's defaults already grant this permission?
 * Implements both exact match and `module.*` wildcard suffix matching
 * (matches the resolution order in RequireAdminPermission middleware).
 */
export function roleGrants(role: AdminRole, permission: string): boolean {
  const list = ROLE_DEFAULTS[role] ?? [];
  for (const granted of list) {
    if (granted === '*' || granted === permission) return true;
    if (granted.endsWith('.*') && permission.startsWith(granted.slice(0, -2) + '.')) {
      return true;
    }
  }
  return false;
}

/**
 * Friendly role label — used in the role-chip selector and the
 * "Already granted by Support role" hint inside the picker.
 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  support: 'Support',
  analyst: 'Analyst',
  read_only: 'Read-only',
};

/**
 * Convert the picker's checkbox state into the JSON payload the API
 * expects. The backend supports both flat ({"users.suspend": true})
 * and nested ({"users": {"suspend": true}}) shapes — we use flat
 * because it round-trips cleanly to/from React state.
 */
export function checkboxStateToPayload(state: Record<string, boolean>): Record<string, true> {
  const out: Record<string, true> = {};
  for (const [key, value] of Object.entries(state)) {
    if (value === true) out[key] = true;
  }
  return out;
}
