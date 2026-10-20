import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with conditional logic, resolving conflicts in favour
 * of the last class given. Without `twMerge`, `cn('p-2', 'p-4')` would emit
 * both and let CSS source order decide — which is not what the caller meant.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
