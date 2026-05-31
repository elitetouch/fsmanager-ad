'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { apiErrorMessage, endpoints } from '@/lib/api';
import { fmtDateTime, fmtRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const perPage = 25;

  const q = useQuery({
    queryKey: ['notifications', 'page', { page, unreadOnly }],
    queryFn: () => endpoints.listNotifications({
      page,
      per_page: perPage,
      unread_only: unreadOnly ? 1 : undefined,
    }),
  });

  const markAll = useMutation({
    mutationFn: () => endpoints.markAllNotificationsRead(),
    onSuccess: () => {
      toast.success('All marked read.');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => endpoints.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Bell-icon feed: assigned support threads, urgent events, system alerts."
        actions={
          q.data && q.data.unreadCount > 0 ? (
            <Button variant="secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : null
        }
      />

      <Card className="mb-4 flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
          Show unread only
        </label>
        {q.data && <Badge tone="muted">{q.data.unreadCount} unread</Badge>}
      </Card>

      {q.isLoading && !q.data ? (
        <Card>{[...Array(6)].map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)}</Card>
      ) : q.data?.notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" />
      ) : (
        <>
          <ul className="space-y-2">
            {q.data?.notifications.map((n) => (
              <li key={n.id}>
                <NotificationCard
                  n={n}
                  onMarkRead={() => markOne.mutate(n.id)}
                />
              </li>
            ))}
          </ul>
          {q.data?.meta && (
            <Pagination
              page={q.data.meta.currentPage}
              lastPage={q.data.meta.lastPage}
              total={q.data.meta.total}
              perPage={q.data.meta.perPage}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function NotificationCard({
  n,
  onMarkRead,
}: {
  n: import('@/lib/api').AdminNotification;
  onMarkRead: () => void;
}) {
  const body = (
    <div className={cn(
      'rounded-lg border p-4 transition',
      n.readAt === null
        ? 'border-[var(--color-brand-primary)] bg-[color:rgb(22_177_45/0.04)]'
        : 'border-[var(--color-brand-border)] bg-white',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{n.title}</p>
          {n.body && <p className="mt-1 text-sm text-[var(--color-brand-muted)]">{n.body}</p>}
          <p className="mt-1 text-[11px] text-[var(--color-brand-muted)]">
            {fmtRelative(n.createdAt)} · {fmtDateTime(n.createdAt)} · <code className="font-mono">{n.type}</code>
          </p>
        </div>
        {n.readAt === null && (
          <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); onMarkRead(); }}>
            Mark read
          </Button>
        )}
      </div>
    </div>
  );

  return n.linkUrl ? <Link href={n.linkUrl} className="block">{body}</Link> : body;
}
