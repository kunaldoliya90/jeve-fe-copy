import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export interface InputProps extends ComponentProps<'input'> {
  /** Marks the field invalid for both styling and assistive tech. */
  hasError?: boolean;
}

export function Input({ className, hasError = false, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground',
        'shadow-rest transition-[border-color,box-shadow,background-color] duration-[160ms] ease-glide',
        'placeholder:text-subtle-foreground',
        'hover:border-border-strong',
        // The ring is drawn as a box-shadow rather than a border so focusing
        // a field never changes its size and nudges the layout sideways.
        'focus:border-primary focus:shadow-glow focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        hasError &&
          'border-danger focus:border-danger focus:shadow-none focus:ring-2 focus:ring-danger/40',
        className,
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
}
