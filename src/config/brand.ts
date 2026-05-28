/**
 * Single source of truth for the FSManager admin portal brand.
 *
 * Inspired by fsinnovation.net (FarmSpeak): a forest-green agritech palette,
 * Inter sans-serif, modern but grounded. Edit this file to rebrand the entire
 * portal — colours flow into `globals.css` via the @theme block.
 *
 * Hex values used here MUST be kept in sync with the CSS variables in
 * `src/app/globals.css`. We mirror them here so that TypeScript code (e.g.
 * chart colours) can read the brand without parsing CSS.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? 'FSManager Admin',
  tagline: 'Super-admin portal',
  company: 'FSInnovation',

  // Primary palette — keep these aligned with @theme tokens in globals.css.
  colors: {
    primary: '#2d7a3e',       // Forest green (fsinnovation.net)
    primaryDark: '#1f5a2c',
    primaryLight: '#5fae6d',
    accent: '#f59e0b',        // Maize amber — warm complement for charts/alerts
    surface: '#ffffff',
    background: '#f7faf8',    // Very pale green-tinted neutral
    foreground: '#0c1f12',    // Near-black with green undertone
    muted: '#5f6f64',
    border: '#e5ebe7',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0284c7',
  },

  // Chart palette — used by Recharts. Hand-tuned for colour-blind legibility.
  chart: ['#2d7a3e', '#f59e0b', '#0284c7', '#9333ea', '#dc2626', '#0d9488'],

  // Typography. We use a single Google-fonts-free system stack so the portal
  // boots fast on slow African networks without an external font request.
  fonts: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
  },

  // Logo. Drop your SVG into /public/logo.svg or change the path here.
  // Until you supply an SVG, the <Logo /> component renders a typographic
  // wordmark using the colours above.
  logo: {
    src: '/logo.svg',
    width: 32,
    height: 32,
  },
} as const;

export type Brand = typeof brand;
