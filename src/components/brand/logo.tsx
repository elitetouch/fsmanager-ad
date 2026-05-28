'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { brand } from '@/config/brand';

interface Props {
  className?: string;
  showWord?: boolean;
  /**
   * Size of the icon mark in pixels (height + width). The wordmark is sized
   * relative to this. Defaults to the brand's preferred size.
   */
  size?: number;
}

/**
 * Brand mark.
 *
 * Render order:
 *   1. If `/public/logo.png` is present → render the raster (real artwork).
 *   2. Otherwise fall back to `/public/logo.svg` (hand-drawn approximation
 *      of the Farm Support Innovation cloud-and-signal mark).
 *
 * Both files are shipped; the PNG only kicks in if you drop it into
 * `/public`. The fallback path runs entirely client-side via an `onError`
 * handler so there's no flash of the wrong logo, and no build-time check
 * is required.
 */
export function Logo({ className, showWord = true, size = brand.logo.width }: Props) {
  const [src, setSrc] = useState<string>(brand.logo.raster);

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={brand.name}
        width={size}
        height={size}
        className="rounded-md object-contain"
        // If logo.png isn't present, swap to the SVG mark once and let it
        // stay. We compare strings to avoid an infinite loop in case the
        // SVG itself ever fails to load.
        onError={() => {
          if (src !== brand.logo.svg) setSrc(brand.logo.svg);
        }}
      />
      {showWord && (
        <div className="leading-tight">
          <p
            className="text-sm font-bold tracking-tight"
            style={{ color: brand.colors.primary }}
          >
            FARM SUPPORT
          </p>
          <p
            className="text-[10px] font-semibold tracking-[0.18em]"
            style={{ color: brand.colors.primaryDark }}
          >
            INNOVATION
          </p>
        </div>
      )}
    </div>
  );
}
