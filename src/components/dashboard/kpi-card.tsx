import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface Props {
  label: string;
  value: string;
  hint?: string;
  delta?: { value: number; positiveIsGood?: boolean };
  icon?: LucideIcon;
  accent?: 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'danger';
}

const ACCENT: Record<NonNullable<Props['accent']>, string> = {
  primary: 'bg-[color:rgb(22_177_45/0.10)] text-[var(--color-brand-primary-dark)]',
  accent: 'bg-[color:rgb(245_158_11/0.16)] text-[#92400e]',
  info: 'bg-[color:rgb(2_132_199/0.14)] text-[var(--color-brand-info)]',
  success: 'bg-[color:rgb(22_163_74/0.14)] text-[var(--color-brand-success)]',
  warning: 'bg-[color:rgb(217_119_6/0.14)] text-[var(--color-brand-warning)]',
  danger: 'bg-[color:rgb(220_38_38/0.14)] text-[var(--color-brand-danger)]',
};

export function KpiCard({ label, value, hint, delta, icon: Icon, accent = 'primary' }: Props) {
  const positive = delta ? (delta.positiveIsGood ?? true) === delta.value >= 0 : true;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand-muted)]">
          {label}
        </p>
        {Icon && (
          <span className={cn('grid h-9 w-9 place-items-center rounded-lg', ACCENT[accent])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-[var(--color-brand-fg)] sm:text-3xl">
        {value}
      </p>
      <div className="flex items-center justify-between gap-2">
        {hint && <p className="text-xs text-[var(--color-brand-muted)]">{hint}</p>}
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              positive
                ? 'bg-[color:rgb(22_163_74/0.12)] text-[var(--color-brand-success)]'
                : 'bg-[color:rgb(220_38_38/0.12)] text-[var(--color-brand-danger)]',
            )}
          >
            {delta.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.value >= 0 ? '+' : ''}
            {delta.value}
          </span>
        )}
      </div>
    </Card>
  );
}
