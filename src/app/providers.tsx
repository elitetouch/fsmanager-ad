'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { makeQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session; the function ref keeps it stable
  // across HMR / Fast Refresh re-mounts.
  const [client] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'white',
            color: 'var(--color-brand-fg)',
            border: '1px solid var(--color-brand-border)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
