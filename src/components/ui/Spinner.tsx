import { Loader2 } from 'lucide-react';

import { cn } from '@/utils/cn';

const sizeClass = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-10',
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizeClass | undefined;
  className?: string | undefined;
  /** Announced to screen readers while the region is busy. */
  label?: string | undefined;
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex', className)}>
      <Loader2
        className={cn('animate-spin text-muted-foreground', sizeClass[size])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
