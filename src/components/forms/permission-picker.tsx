'use client';

import { useMemo } from 'react';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import {
  PERMISSION_CATALOG,
  ROLE_LABELS,
  type AdminRole,
  roleGrants,
} from '@/lib/permissions-catalog';
import { cn } from '@/lib/utils';

interface Props {
  /** The role currently selected on the form. Drives the "already granted" UI state. */
  role: AdminRole;
  /** Current override state. `true` means "explicitly granted as an override". */
  value: Record<string, boolean>;
  /** Called with the new override map whenever the admin ticks a box. */
  onChange: (next: Record<string, boolean>) => void;
}

/**
 * Grouped checkbox picker for admin capabilities.
 *
 * Visual states per row:
 *   1. **Already granted by role** — green tick, label dimmed, checkbox
 *      disabled. The admin can't accidentally try to "un-grant" a role
 *      default; per-admin overrides on the backend are additive only.
 *   2. **Not granted, available** — empty checkbox, fully clickable.
 *      Ticking flips the override on.
 *   3. **Manually granted** — filled brand-green checkbox; row gets a
 *      subtle background tint so overrides stand out at a glance.
 *
 * Super-admin / admin roles get `*` (everything) — the picker collapses
 * into a single "this role has everything" notice for those.
 */
export function PermissionPicker({ role, value, onChange }: Props) {
  const roleHasEverything = role === 'super_admin' || role === 'admin';

  const stats = useMemo(() => {
    let granted = 0;
    let extras = 0;
    for (const group of PERMISSION_CATALOG) {
      for (const item of group.items) {
        if (roleGrants(role, item.key)) granted++;
        else if (value[item.key]) extras++;
      }
    }
    return { granted, extras };
  }, [role, value]);

  if (roleHasEverything) {
    return (
      <div
        className="flex items-center gap-3 rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-[color:rgb(22_177_45/0.06)] p-4 text-sm"
        role="status"
      >
        <Sparkles className="h-5 w-5 shrink-0 text-[var(--color-brand-primary)]" />
        <div>
          <p className="font-medium text-[var(--color-brand-fg)]">
            {ROLE_LABELS[role]} role grants every capability.
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-brand-muted)]">
            No per-admin overrides needed. Pick a more restricted role if you
            want to scope this admin&apos;s access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top summary strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-[color:rgb(22_177_45/0.10)] px-2.5 py-1 font-medium text-[var(--color-brand-primary-dark)]">
          <ShieldCheck className="h-3 w-3" />
          {stats.granted} via {ROLE_LABELS[role]} role
        </span>
        {stats.extras > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:rgb(245_158_11/0.16)] px-2.5 py-1 font-medium text-[#92400e]">
            <CheckCircle2 className="h-3 w-3" />
            {stats.extras} extra override{stats.extras === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Per-module groups */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PERMISSION_CATALOG.map((group) => (
          <div
            key={group.name}
            className="rounded-[var(--radius-card)] border border-[var(--color-brand-border)] bg-white"
          >
            <div className="border-b border-[var(--color-brand-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--color-brand-fg)]">{group.name}</p>
              <p className="mt-0.5 text-xs text-[var(--color-brand-muted)]">{group.description}</p>
            </div>
            <ul className="divide-y divide-[var(--color-brand-border)]">
              {group.items.map((item) => {
                const grantedByRole = roleGrants(role, item.key);
                const overridden = value[item.key] === true;
                const checked = grantedByRole || overridden;

                return (
                  <li
                    key={item.key}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition',
                      overridden && !grantedByRole
                        ? 'bg-[color:rgb(22_177_45/0.04)]'
                        : '',
                    )}
                  >
                    <label
                      className={cn(
                        'flex flex-1 cursor-pointer items-start gap-3',
                        grantedByRole && 'cursor-not-allowed',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={grantedByRole}
                        onChange={(e) => {
                          const next = { ...value };
                          if (e.target.checked) next[item.key] = true;
                          else delete next[item.key];
                          onChange(next);
                        }}
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--color-brand-border)] text-[var(--color-brand-primary)]',
                          'focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:ring-offset-1',
                          grantedByRole && 'cursor-not-allowed opacity-60',
                        )}
                        aria-describedby={`${item.key}-desc`}
                      />
                      <div className="flex-1 leading-tight">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              grantedByRole
                                ? 'text-[var(--color-brand-muted)]'
                                : 'text-[var(--color-brand-fg)]',
                            )}
                          >
                            {item.label}
                          </span>
                          {grantedByRole && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[color:rgb(22_177_45/0.10)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand-primary-dark)]">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              via {ROLE_LABELS[role]}
                            </span>
                          )}
                        </div>
                        <p
                          id={`${item.key}-desc`}
                          className="mt-0.5 text-xs text-[var(--color-brand-muted)]"
                        >
                          {item.description}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[var(--color-brand-muted)]">
                          {item.key}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer help */}
      <p className="text-[11px] text-[var(--color-brand-muted)]">
        <strong>Role defaults</strong> are always granted — they appear
        pre-checked and locked. <strong>Extras</strong> are per-admin
        overrides that grant access on top of the role. The API enforces every
        ticked key; this picker only assembles the JSON payload you would
        otherwise have to write by hand.
      </p>
    </div>
  );
}
