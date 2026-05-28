'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { readAdmin, readToken, type StoredAdmin } from '@/lib/auth';

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<StoredAdmin | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Client-side auth gate. The portal is a single-page admin UI, so we hold
  // the Sanctum token in localStorage; no SSR session is involved.
  useEffect(() => {
    const token = readToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setAdmin(readAdmin());
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="skeleton h-3 w-32 rounded" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
      {/* Sidebar — desktop (sticky), mobile (sheet) */}
      <div className="hidden lg:block">
        <Sidebar admin={admin} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl">
            <Sidebar admin={admin} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <Topbar admin={admin} onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
