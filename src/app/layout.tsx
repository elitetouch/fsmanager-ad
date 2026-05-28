import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { brand } from '@/config/brand';

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: `${brand.tagline} for ${brand.company}.`,

  // Favicon strategy:
  //   - icon (light mode) → /favicon.svg       (dark-forest backdrop, vivid-green mark)
  //   - icon (dark  mode) → /favicon-dark.svg  (transparent, vivid-green mark)
  //
  // Both files live in /public. To add raster fallbacks later (iOS
  // home-screen, legacy IE), drop /public/apple-touch-icon.png (180x180)
  // and /public/favicon.ico and extend this object with `apple` and
  // `shortcut` fields — no other code change required.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
    ],
  },

  applicationName: brand.name,
  appleWebApp: {
    capable: true,
    title: brand.name,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  // Brand-coloured browser chrome (Chrome on Android, mobile Safari URL bar).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16b12d' },
    { media: '(prefers-color-scheme: dark)', color: '#0e6b1a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
