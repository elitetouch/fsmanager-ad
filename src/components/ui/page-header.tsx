import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-brand-fg)] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-brand-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
