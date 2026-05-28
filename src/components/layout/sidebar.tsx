'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  CircleDollarSign,
  Coins,
  Compass,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareText,
  Receipt,
  ShieldCheck,
  Tractor,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminCan, type StoredAdmin } from '@/lib/auth';
import { Logo } from '@/components/brand/logo';

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm?: string;
  badge?: string;
};

const PRIMARY: Item[] = [
  { href: '/overview', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view' },
  { href: '/users', label: 'Users', icon: Users, perm: 'users.view' },
  { href: '/farms', label: 'Farms', icon: Tractor, perm: 'farms.view' },
  { href: '/accounts', label: 'Accounts', icon: Receipt, perm: 'accounts.view' },
  { href: '/tokens', label: 'Tokens', icon: Coins, perm: 'tokens.view' },
  { href: '/support', label: 'Support', icon: MessageSquareText, perm: 'support.view' },
];

const ANALYTICS: Item[] = [
  { href: '/segmentation', label: 'Segmentation', icon: Compass, perm: 'segmentation.view' },
  { href: '/audit-logs', label: 'Audit log', icon: Activity, perm: 'audit.view' },
];

const ADMIN: Item[] = [
  { href: '/admins', label: 'Admin users', icon: ShieldCheck, perm: 'admin_users.create' },
];

interface Props {
  admin: StoredAdmin | null;
  onNavigate?: () => void;
}

export function Sidebar({ admin, onNavigate }: Props) {
  const pathname = usePathname();

  function renderGroup(title: string, items: Item[]) {
    const visible = items.filter((i) => !i.perm || adminCan(admin, i.perm));
    if (visible.length === 0) return null;
    return (
      <div className="mb-6">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-muted)]">
          {title}
        </p>
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                    active
                      ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                      : 'text-[var(--color-brand-fg)] hover:bg-[var(--color-brand-bg)]',
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-white' : 'text-[var(--color-brand-muted)]')} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-[var(--color-brand-border)] bg-white">
      <div className="flex items-center justify-center border-b border-[var(--color-brand-border)] p-4">
        {/*
          The official logo already contains the "FARM SUPPORT INNOVATION"
          wordmark — we render it at 160px wide so that text stays
          readable in the 260px-wide sidebar.
        */}
        <Logo size={160} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {renderGroup('Operations', PRIMARY)}
        {renderGroup('Analytics', ANALYTICS)}
        {renderGroup('Administration', ADMIN)}
      </nav>

      <div className="border-t border-[var(--color-brand-border)] p-4 text-[11px] text-[var(--color-brand-muted)]">
        <p className="flex items-center gap-2">
          <LifeBuoy className="h-3.5 w-3.5" />
          Issues? Open an internal thread in <strong>/support</strong>.
        </p>
        <p className="mt-2 opacity-70">© {new Date().getFullYear()} Farm Support Innovation</p>
      </div>
    </aside>
  );
}
