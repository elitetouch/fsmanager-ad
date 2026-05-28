import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { brand } from '@/config/brand';

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: `${brand.tagline} for ${brand.company}.`,
  icons: { icon: '/favicon.svg' },
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
