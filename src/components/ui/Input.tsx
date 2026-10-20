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
        'placeholder:text-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        hasError && 'border-danger',
        className,
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
}
