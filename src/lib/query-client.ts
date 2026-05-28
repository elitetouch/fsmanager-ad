import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client.
 *
 * Defaults: refetch on window focus is OFF because operators tab away to
 * Notion/Slack and don't want a 401-flicker on every return. Stale time is
 * 30s — short enough for "fresh feel", long enough to avoid double-fetches
 * when switching pages.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30 * 1000,
      },
    },
  });
}
