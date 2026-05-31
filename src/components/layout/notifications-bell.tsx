'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Bell-icon notifications drop-down.
 *
 * Polls the unread count every 30 seconds. Opening the popover fetches
 * the recent 20 notifications. Clicking a single row marks it read; the
 * "Mark all read" button at the bottom calls /notifications/read-all.
 *
 * The DEMO mode wrapper in lib/api isn't necessary here — when the API
 * is unreachable, useQuery just shows the count as 0 and the popover
 * shows "No notifications yet."
 */
export function NotificationsBell() {
  const qc = useQueryClient();

  const unread = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => endpoints.notificationsUnreadCount().catch(() => ({ unreadCount: 0 })),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const list = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () =>
      endpoints.listNotifications({ per_page: 20 }).catch(() => ({
        notifications: [],
        meta: { currentPage: 1, perPage: 20, total: 0, lastPage: 1 },
        unreadCount: 0,
      })),
    enabled: false, // only fetch on demand (when the popover opens)
  });

  // Whenever the unread count changes, mark the recent-list cache stale
  // so the next open re-fetches.
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['notifications', 'recent'] });
  }, [unread.data?.unreadCount, qc]);

  const markRead = useMutation({
    mutationFn: (id: string) => endpoints.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => endpoints.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const count = unread.data?.unreadCount ?? 0;
  const items = list.data?.notifications ?? [];

  return (
    <Dropdown.Root onOpenChange={(open) => { if (open) list.refetch(); }}>
      <Dropdown.Trigger asChild>
        <button
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-brand-fg)] transition hover:bg-[var(--color-brand-bg)]"
          aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--color-brand-danger)] px-1 text-[10px] font-semibold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(380px,calc(100vw-2rem))] rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-brand-border)] px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {count > 0 && (
              <button
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-brand-primary)] hover:underline"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-[400px] overflow-y-auto p-1">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-[var(--color-brand-muted)]">
                No notifications yet.
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <NotificationRow
                    notification={n}
                    onMarkRead={() => markRead.mutate(n.id)}
                  />
                </li>
              ))
            )}
          </ul>

          <Dropdown.Separator className="h-px bg-[var(--color-brand-border)]" />
          <Dropdown.Item asChild>
            <Link
              href="/notifications"
              className="block px-3 py-2 text-center text-xs font-medium text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-bg)]"
            >
              See all notifications
            </Link>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function NotificationRow({
  notification: n,
  onMarkRead,
}: {
  notification: import('@/lib/api').AdminNotification;
  onMarkRead: () => void;
}) {
  const inner = (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-[var(--color-brand-bg)]',
        n.readAt === null && 'bg-[color:rgb(22_177_45/0.04)]',
      )}
    >
      <span
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          n.readAt === null ? 'bg-[var(--color-brand-primary)]' : 'bg-transparent',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-brand-fg)]">{n.title}</p>
        {n.body && (
          <p className="line-clamp-2 text-xs text-[var(--color-brand-muted)]">{n.body}</p>
        )}
        <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--color-brand-muted)]">
          {fmtRelative(n.createdAt)}
        </p>
      </div>
      {n.readAt === null && (
        <button
          aria-label="Mark read"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead();
          }}
          className="rounded p-1 text-[var(--color-brand-muted)] hover:bg-white"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return n.linkUrl ? (
    <Link href={n.linkUrl} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
