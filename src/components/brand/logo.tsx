'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { brand } from '@/config/brand';

type Tone = 'color' | 'white';

interface Props {
  className?: string;
  /**
   * Pixel size (width). The image is rendered with `height: auto` so the
   * intrinsic aspect ratio of the source artwork is preserved exactly.
   */
  size?: number;
  /**
   * `'color'` (default) — render the official artwork untouched.
   * `'white'` — recolour all opaque pixels to pure white using a CSS
   *   filter chain. The shape and composition are NOT redrawn; only the
   *   colour channel is modified, so the official logo geometry stays
   *   pixel-identical. Use on dark backgrounds (login gradient, dark
   *   hero panels, photographic overlays).
   */
  tone?: Tone;
}

/**
 * Renders the official Farm Support Innovation logo from /public.
 *
 * Source priority: `/logo.png` (the photographic master) → `/logo.svg`
 * (the vector source) via an onError fallback. Both files live in
 * /public alongside this component; neither is generated or redrawn.
 *
 * The wordmark "FARM SUPPORT INNOVATION" is part of the source artwork
 * itself — so this component renders the image only and does NOT layer
 * any additional text on top. To keep the wordmark legible, render at
 * ≥ 100 px wide in dense layouts (sidebar, login hero, marketing).
 */
export function Logo({ className, size = 120, tone = 'color' }: Props) {
  const [src, setSrc] = useState<string>('/logo.png');

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={brand.name}
      width={size}
      // height auto → preserves the source's intrinsic aspect ratio.
      style={{
        height: 'auto',
        // tone='white' chain:
        //   brightness(0)  → flatten every opaque pixel to black
        //   invert(1)      → black → white
        //   Transparent pixels stay transparent.
        // The result: pixel-identical geometry, recoloured to white.
        // Drop-shadow is for legibility against busy dark backgrounds.
        ...(tone === 'white'
          ? {
              filter:
                'brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0,0,0,0.18))',
            }
          : null),
      }}
      className={cn('block select-none', className)}
      onError={() => {
        if (src !== '/logo.svg') setSrc('/logo.svg');
      }}
      draggable={false}
    />
  );
}
