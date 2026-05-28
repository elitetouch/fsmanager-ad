import { redirect } from 'next/navigation';

/**
 * Root redirect.
 *
 * `/` is not a meaningful page — the entry point is `/overview` (the
 * dashboard) for authenticated admins, or `/login` for everyone else. The
 * (portal) layout handles the auth gate; we just bounce here.
 */
export default function RootPage() {
  redirect('/overview');
}
