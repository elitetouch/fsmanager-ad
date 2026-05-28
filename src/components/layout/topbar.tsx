'use client';

import { LogOut, Menu, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { endpoints } from '@/lib/api';
import { clearToken, type StoredAdmin } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

interface Props {
  admin: StoredAdmin | null;
  onOpenSidebar: () => void;
}

export function Topbar({ admin, onOpenSidebar }: Props) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await endpoints.logout();
    } catch {
      // ignore — we're clearing locally anyway
    }
    clearToken();
    toast('You have been signed out.');
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--color-brand-border)] bg-white/95 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="ml-auto flex items-center gap-3">
        {admin && (
          <Badge
            tone={
              admin.role === 'super_admin'
                ? 'primary'
                : admin.role === 'admin'
                  ? 'info'
                  : admin.role === 'support'
                    ? 'accent'
                    : 'neutral'
            }
            className="hidden sm:inline-flex"
          >
            {admin.role.replace('_', ' ')}
          </Badge>
        )}

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition hover:bg-[var(--color-brand-bg)]">
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-brand-primary)] text-xs font-semibold text-white"
              >
                {initials(admin?.name)}
              </span>
              <span className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">{admin?.name ?? 'Admin'}</p>
                <p className="text-[11px] leading-tight text-[var(--color-brand-muted)]">{admin?.email}</p>
              </span>
            </button>
          </Dropdown.Trigger>

          <Dropdown.Portal>
            <Dropdown.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[200px] rounded-[var(--radius-button)] border border-[var(--color-brand-border)] bg-white p-1 shadow-lg"
            >
              <Dropdown.Item
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-[var(--color-brand-bg)]',
                )}
                onSelect={() => router.push('/profile')}
              >
                <UserRound className="h-4 w-4 text-[var(--color-brand-muted)]" /> Profile
              </Dropdown.Item>
              <Dropdown.Separator className="my-1 h-px bg-[var(--color-brand-border)]" />
              <Dropdown.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--color-brand-danger)] outline-none data-[highlighted]:bg-[color:rgb(220_38_38/0.08)]"
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </div>
    </header>
  );
}
