'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface Props {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, lastPage, total, perPage, onChange }: Props) {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  return (
    <div className="mt-4 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      <p className="text-xs text-[var(--color-brand-muted)]">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{total.toLocaleString()}</strong>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm text-[var(--color-brand-muted)]">
          Page <strong className="text-[var(--color-brand-fg)]">{page}</strong> of {lastPage || 1}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(Math.min(lastPage, page + 1))}
          disabled={page >= lastPage}
          aria-label="Next page"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
