import { cn } from '@/lib/utils';
import { brand } from '@/config/brand';

interface Props {
  className?: string;
  showWord?: boolean;
}

/**
 * Brand mark. Renders an SVG glyph + wordmark.
 *
 * If you have a real logo, drop it into /public/logo.svg and switch this
 * component to <Image src="/logo.svg" .../> — that's a one-line change.
 */
export function Logo({ className, showWord = true }: Props) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-brand-primary)] text-white shadow-sm"
        style={{ background: brand.colors.primary }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M3 14c3-7 9-10 18-10-1 9-5 14-12 16-2 0-4 0-6-1l-2 1V14z"
            fill="currentColor"
            opacity="0.95"
          />
          <path d="M5 18c4-4 8-6 14-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      {showWord && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-[var(--color-brand-fg)]">
            {brand.name}
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-brand-muted)]">
            {brand.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
