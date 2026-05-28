'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { brand } from '@/config/brand';

type Tone = 'color' | 'white';

interface Props {
  className?: string;
  showWord?: boolean;
  /**
   * Size of the icon mark in pixels (width + height). The wordmark scales
   * relative to this. Defaults to the brand's preferred size.
   */
  size?: number;
  /**
   * `'color'` (default) — render the official two-green mark. Tries
   *   `/public/logo.png` first; falls back to `/public/logo.svg`.
   * `'white'` — render the white-on-transparent mark for dark surfaces
   *   (login hero, dark nav, image overlays). Bypasses the PNG since
   *   the official PNG is coloured.
   */
  tone?: Tone;
}

/**
 * Brand mark.
 *
 * Used in the sidebar, topbar, login hero, and anywhere else we present
 * the company identity. The wordmark renders "FARM SUPPORT" + "INNOVATION"
 * in two colour stacks that match the official logo; on dark surfaces
 * (`tone="white"`) the wordmark switches to white so it stays legible.
 */
export function Logo({
  className,
  showWord = true,
  size = brand.logo.width,
  tone = 'color',
}: Props) {
  // For tone='white' we always use the white SVG (PNG is coloured).
  // For tone='color' we prefer the PNG (real artwork) and fall back to
  // the SVG approximation if the PNG is missing.
  const initialSrc = tone === 'white' ? brand.logo.svgWhite : brand.logo.raster;
  const [src, setSrc] = useState<string>(initialSrc);

  // Reset when tone toggles (e.g. the Logo gets re-themed by a parent)
  useEffect(() => {
    setSrc(tone === 'white' ? brand.logo.svgWhite : brand.logo.raster);
  }, [tone]);

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={brand.name}
        width={size}
        height={size}
        className="object-contain"
        // If logo.png is absent in the color path, swap to /logo.svg
        // once and let it stay. The string compare guards against an
        // infinite loop in case the SVG itself ever 404s.
        onError={() => {
          if (tone === 'color' && src !== brand.logo.svg) {
            setSrc(brand.logo.svg);
          }
        }}
      />
      {showWord && (
        <div className="leading-tight">
          <p
            className="text-sm font-bold tracking-tight"
            style={{ color: tone === 'white' ? '#ffffff' : brand.colors.primary }}
          >
            FARM SUPPORT
          </p>
          <p
            className="text-[10px] font-semibold tracking-[0.18em]"
            style={{
              color:
                tone === 'white'
                  ? 'rgba(255, 255, 255, 0.78)'
                  : brand.colors.primaryDark,
            }}
          >
            INNOVATION
          </p>
        </div>
      )}
    </div>
  );
}
