'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-primary)]',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-dark)] shadow-sm',
        secondary:
          'bg-white text-[var(--color-brand-fg)] border border-[var(--color-brand-border)] hover:bg-[var(--color-brand-bg)]',
        ghost: 'text-[var(--color-brand-fg)] hover:bg-[var(--color-brand-bg)]',
        danger: 'bg-[var(--color-brand-danger)] text-white hover:opacity-90 shadow-sm',
        outline:
          'border border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] hover:bg-[color:rgb(22_177_45/0.08)]',
        link: 'text-[var(--color-brand-primary)] underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonStyles({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';
