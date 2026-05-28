import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn(...)` — combine class names with conflict resolution.
 * Use everywhere; never concatenate Tailwind classes by hand.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
