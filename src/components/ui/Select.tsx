import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export interface SelectProps extends ComponentProps<'select'> {
  hasError?: boolean | undefined;
}

/**
 * A native `<select>`, styled.
 *
 * Native rather than a listbox built from divs: the OS picker is keyboard
 * and screen-reader correct for free, scrolls properly on a phone, and costs
 * nothing to ship. The only thing worth replacing is the default arrow, and
 * that is one `appearance-none` and one icon — not a dependency.
 */
export function Select({ className, hasError = false, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-border bg-surface',
          'pr-9 pl-3 text-sm text-foreground shadow-rest',
          'transition-[border-color,box-shadow] duration-[160ms] ease-glide',
          'hover:border-border-strong',
          'focus:border-primary focus:shadow-glow focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-danger',
          className,
        )}
        aria-invalid={hasError || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
