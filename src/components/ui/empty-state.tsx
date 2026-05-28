import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'card flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 rounded-full bg-[var(--color-brand-bg)] p-3 text-[var(--color-brand-primary)]">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--color-brand-fg)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-[var(--color-brand-muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
