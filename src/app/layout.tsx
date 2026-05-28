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

  // Favicon = the official /public/logo.svg, served as-is. The browser
  // scales it to whatever tab/window size it needs; SVG keeps the brand
  // mark crisp at every zoom level. No separate favicon files are shipped.
  //
  // To add raster fallbacks later (iOS home-screen icon, legacy IE), drop
  // /public/apple-touch-icon.png (180x180) and /public/favicon.ico into
  // /public and extend this object with `apple` and `shortcut` fields.
  icons: {
    icon: { url: '/logo.svg', type: 'image/svg+xml' },
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
