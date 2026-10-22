import type { ComponentProps } from 'react';

import { type BadgeVariantProps, badgeVariants } from '@/components/ui/badgeVariants';
import { cn } from '@/utils/cn';

export interface BadgeProps extends ComponentProps<'span'>, BadgeVariantProps {
  /**
   * Adds a soft pulsing halo. For a state that is *currently changing* —
   * a running review — and nothing else. A badge that pulses when it is not
   * going to change again teaches the reader to ignore the pulse.
   */
  live?: boolean | undefined;
}

export function Badge({
  className,
  tone,
  variant,
  size,
  live = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, variant, size }), className)} {...props}>
      {live ? (
        <span aria-hidden className="relative flex size-1.5 shrink-0">
          <span className="absolute inset-0 animate-halo rounded-full bg-current" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {children}
    </span>
  );
}
