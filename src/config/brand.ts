/**
 * Single source of truth for the FSManager admin portal brand.
 *
 * Palette derived from the Farm Support Innovation primary mark — two
 * greens: a vivid lime-leaning green for the wordmark + cloud interior,
 * and a deep forest green for the cloud outline and "INNOVATION" text.
 *
 * Hex values used here MUST be kept in sync with the CSS variables in
 * `src/app/globals.css`. We mirror them here so that TypeScript code (e.g.
 * chart colours) can read the brand without parsing CSS.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Farm Support Innovation',
  tagline: 'Super-admin portal',
  company: 'Farm Support Innovation',

  // Primary palette — keep these aligned with @theme tokens in globals.css.
  colors: {
    primary: '#16B12D',       // Vivid lime-forest from "FARM SUPPORT" + cloud interior
    primaryDark: '#0E6B1A',   // Deep forest from "INNOVATION" + cloud outline
    primaryLight: '#6DD97D',  // Hand-tuned lighter shade for hovers / chips
    accent: '#F59E0B',        // Maize amber — warm complement for charts/alerts
    surface: '#FFFFFF',
    background: '#F4FAF5',    // Very pale lime-tinted neutral
    foreground: '#082710',    // Near-black with green undertone (matches "INNOVATION")
    muted: '#5C6F60',
    border: '#DDE7E0',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#0284C7',
  },

  // Chart palette — used by Recharts. Hand-tuned for colour-blind legibility.
  // First entry is the vivid brand green; second is dark forest so brand
  // tone leads the trends and bars.
  chart: ['#16B12D', '#0E6B1A', '#F59E0B', '#0284C7', '#9333EA', '#DC2626'],

  // Typography. We use a single Google-fonts-free system stack so the portal
  // boots fast on slow African networks without an external font request.
  fonts: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
  },

  // Logo strategy:
  //   1. Default (tone='color'): try /public/logo.png first; on 404 the
  //      <Logo /> component swaps to /public/logo.svg (the hand-drawn
  //      Farm Support Innovation mark in vivid + dark-forest greens).
  //   2. tone='white': render /public/logo-white.svg directly — used on
  //      dark surfaces (login hero gradient, dark hero sections, dark
  //      navigation). PNG is skipped here because the official PNG is
  //      coloured and would not read against a dark backdrop.
  //   3. Favicons: see /public/favicon.svg (light-mode browser tabs) and
  //      /public/favicon-dark.svg (dark-mode browser tabs).
  logo: {
    raster: '/logo.png',
    svg: '/logo.svg',
    svgWhite: '/logo-white.svg',
    width: 36,
    height: 36,
  },
} as const;

export type Brand = typeof brand;
