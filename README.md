# FSManager Admin Portal

> Standalone Next.js super-admin portal for FSManager (FSInnovation /
> FarmSpeak). Copy this folder into its own GitHub repo, push, and deploy
> on Vercel — no other configuration required beyond a single environment
> variable.

![brand](public/logo.svg)

---

## What this is

A web app that lets the platform-operating company (FSInnovation) run
the FSManager SaaS:

- KPI dashboard with daily trends (Recharts)
- Tenant user management (search, suspend, verify, notes)
- Farm management (archive, restore, notes)
- Account + token-balance browser
- Token operations: live ledger, manual credit/debit with reason,
  price activation, purchase history
- In-house support inbox with internal notes
- Country / state / breed / mortality segmentation
- Append-only admin audit log feed
- Super-admin: create new admin users with role + per-admin permissions
- Self profile + capability list

Every page maps 1:1 to an endpoint already shipped on the Laravel API.
See `src/lib/api.ts` — every backend route is a single function in
`endpoints`.

## Tech stack

- **Next.js 15** (App Router, React 19 RC)
- **TypeScript** strict
- **Tailwind CSS v4** (CSS-first config — see `src/app/globals.css`)
- **TanStack Query v5** for server state
- **Axios** for HTTP
- **Radix UI** primitives (Dialog, Tabs, Select, Dropdown)
- **Recharts** for charts
- **react-hook-form + zod** for forms
- **lucide-react** for icons
- **sonner** for toasts

No CDN dependency at runtime — everything is bundled. The font is a
system stack so the portal works on low-bandwidth African networks.

## Folder structure

```
fsmanager-admin/
├── public/
│   ├── favicon.svg
│   └── logo.svg                  ← swap with the real brand mark
├── src/
│   ├── app/
│   │   ├── globals.css           ← Tailwind v4 + brand tokens
│   │   ├── layout.tsx
│   │   ├── providers.tsx
│   │   ├── page.tsx              ← redirects to /overview
│   │   ├── login/page.tsx        ← public sign-in
│   │   └── (portal)/             ← every authenticated page lives here
│   │       ├── layout.tsx        ← injects PortalShell
│   │       ├── overview/page.tsx
│   │       ├── users/{page,…}
│   │       ├── farms/{page,…}
│   │       ├── accounts/{page,…}
│   │       ├── tokens/page.tsx
│   │       ├── support/{page,…}
│   │       ├── segmentation/page.tsx
│   │       ├── audit-logs/page.tsx
│   │       ├── admins/page.tsx
│   │       └── profile/page.tsx
│   ├── components/
│   │   ├── brand/logo.tsx
│   │   ├── charts/{trend-chart,bar-stat}.tsx
│   │   ├── dashboard/kpi-card.tsx
│   │   ├── layout/{sidebar,topbar,portal-shell}.tsx
│   │   └── ui/{button,card,input,badge,table,tabs,dialog,select,…}.tsx
│   ├── config/brand.ts           ← single source of truth for the brand
│   ├── lib/
│   │   ├── api.ts                ← every backend endpoint = one function
│   │   ├── auth.ts               ← token + admin storage; capability check
│   │   ├── format.ts             ← currency / number / date formatters
│   │   ├── query-client.ts
│   │   └── utils.ts              ← cn() helper
│   └── types/api.ts              ← TS types for API responses
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── vercel.json
└── README.md
```

## Run locally (5 minutes)

You need:
- Node.js ≥ 20
- npm (or pnpm / yarn — pick one)
- The FSManager Laravel API running and reachable

```bash
# 1. install
npm install

# 2. point at your API
cp .env.example .env.local
# edit .env.local — set NEXT_PUBLIC_API_BASE_URL to your Laravel host
#   dev: http://localhost:8000
#   prod: https://api.fsinnovation.net (or wherever)

# 3. boot
npm run dev
```

Then open <http://localhost:3000> and sign in with the super-admin
credentials seeded by `AdminUserSeeder` (`SUPER_ADMIN_EMAIL` /
`SUPER_ADMIN_PASSWORD` from the Laravel `.env`).

## Standalone deployment

This folder is **fully self-contained**. There is no monorepo glue, no
hidden Laravel coupling at build time (the API is contacted only at
runtime).

### Push to its own GitHub repo

```bash
# from inside fsmanager-admin/
git init
git add .
git commit -m "feat: standalone fsmanager admin portal"
git branch -M main
git remote add origin git@github.com:<your-org>/fsmanager-admin.git
git push -u origin main
```

### Deploy on Vercel

1. Visit <https://vercel.com/new> and import the GitHub repo.
2. Vercel auto-detects Next.js. Leave the build command as `next build`
   and the install command as `npm install` (both are pinned in
   `vercel.json`).
3. Add the following **environment variable** (Production, Preview, and
   Development):
   - `NEXT_PUBLIC_API_BASE_URL` → e.g. `https://api.fsinnovation.net`
4. Click **Deploy**.

The first deploy takes ~60 seconds. Subsequent pushes auto-deploy.

### CORS reminder

If your Laravel API blocks the Vercel origin, allow it in the
`HandleCors` middleware (Laravel's `config/cors.php`):

```php
'allowed_origins' => [
    'http://localhost:3000',
    'https://fsmanager-admin.vercel.app',          // your Vercel project URL
    'https://admin.fsinnovation.net',              // your custom domain
],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => false,                   // we use bearer tokens, not cookies
```

The admin portal uses bearer-token auth (Sanctum personal access
tokens), not cookies — so `withCredentials` is false on both sides.

## How to rebrand

Everything brand-specific lives in **two files**:

1. `src/config/brand.ts` — colors, fonts, name, logo path. TypeScript
   reads these.
2. `src/app/globals.css` — the `@theme` block. Tailwind reads these.

Update both consistently. Drop a new SVG into `public/logo.svg` to
replace the placeholder mark — the `<Logo />` component renders it
automatically.

## How the API client works

`src/lib/api.ts` exports an `endpoints` object. Every backend route
documented in `docs/API_ENDPOINTS.md` of the Laravel repo is one
TypeScript function on this object:

```ts
import { endpoints } from '@/lib/api';

// GET /api/v1/admin/dashboard
const snap = await endpoints.dashboard();

// POST /api/v1/admin/tokens/adjust
await endpoints.tokenAdjust({
  account_id: '01HXY…',
  token_type: 'broiler',
  tier: 'basic',
  entry_type: 'credit',
  quantity: 500,
  reason: 'Goodwill credit',
});
```

The axios instance auto-attaches the admin bearer token and bounces to
`/login` on a 401. Use `apiData(api.get(...))` to unwrap the
`{success, message, data}` envelope.

## Auth flow

```
login screen → POST /admin/auth/login
            ← { admin, token }

token + admin saved to localStorage (keys are namespaced)

every page → axios interceptor attaches `Authorization: Bearer …`
on 401 → clearToken() + redirect to /login
on logout → POST /admin/auth/logout, clear, redirect
```

`adminCan(admin, 'permission.key')` mirrors the API's resolution and is
used to hide menu items the current admin cannot fire. The API is still
the source of truth — never trust the UI check alone.

## Adding a new page

```
1. Add a function to src/lib/api.ts under `endpoints`.
2. Add a route file under src/app/(portal)/<your-page>/page.tsx.
3. Add a sidebar entry in src/components/layout/sidebar.tsx with the
   permission key.
4. Use the existing UI primitives (Card, Table, Button, Badge, etc.) and
   TanStack Query (useQuery / useMutation) for state.
```

## License

Proprietary. © FSInnovation.
