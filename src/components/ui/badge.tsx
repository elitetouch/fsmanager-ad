import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeStyles = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-[var(--color-brand-border)] bg-white text-[var(--color-brand-muted)]',
        primary:
          'border-transparent bg-[color:rgb(45_122_62/0.10)] text-[var(--color-brand-primary-dark)]',
        accent:
          'border-transparent bg-[color:rgb(245_158_11/0.16)] text-[#92400e]',
        success: 'border-transparent bg-[color:rgb(22_163_74/0.14)] text-[var(--color-brand-success)]',
        warning: 'border-transparent bg-[color:rgb(217_119_6/0.14)] text-[var(--color-brand-warning)]',
        danger: 'border-transparent bg-[color:rgb(220_38_38/0.14)] text-[var(--color-brand-danger)]',
        info: 'border-transparent bg-[color:rgb(2_132_199/0.14)] text-[var(--color-brand-info)]',
        muted: 'border-[var(--color-brand-border)] bg-[var(--color-brand-bg)] text-[var(--color-brand-muted)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone }), className)} {...props} />;
}
