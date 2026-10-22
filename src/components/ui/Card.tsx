import type { ComponentProps, ElementType } from 'react';

import { cn } from '@/utils/cn';

const toneClass = {
  /** The default panel. */
  default: 'border-border bg-surface',
  /** Recedes — for a container holding other cards. */
  sunken: 'border-border-hairline bg-surface-sunken',
  /** Carries a finding that needs a person. */
  warning: 'border-warning/35 bg-warning/[0.06]',
  /** Carries something a reader must not quote. */
  danger: 'border-danger/35 bg-danger/[0.05]',
  /** Carries a positive conclusion. */
  success: 'border-success/30 bg-success/[0.05]',
  /** The one card on a screen worth looking at first. */
  feature: 'border-primary/25 bg-surface',
} as const;

const elevationClass = {
  flat: '',
  rest: 'shadow-rest',
  lift: 'shadow-lift',
  float: 'shadow-float',
} as const;

export interface CardProps extends ComponentProps<'div'> {
  tone?: keyof typeof toneClass | undefined;
  elevation?: keyof typeof elevationClass | undefined;
  /** Raises on hover. Only for a card that is itself a link or a button. */
  interactive?: boolean | undefined;
  /**
   * Render as something else — `section`, `article`, `li` — while keeping the
   * styling. A panel with a heading is a `section`, not a `div`, and a card
   * component that forces a `div` is how an app ends up with no landmarks.
   */
  as?: ElementType | undefined;
}

/**
 * The app's one panel surface.
 *
 * Elevation is a token rather than a shadow written at the call site because
 * light and dark need genuinely different shadows — a black blur is invisible
 * on a dark surface, so the dark palette carries a light inner hairline
 * instead. A component writing `shadow-[0_2px_8px_...]` inline gets that
 * wrong in one of the two themes, every time.
 */
export function Card({
  className,
  tone = 'default',
  elevation = 'rest',
  interactive = false,
  as,
  ...props
}: CardProps) {
  const Component = as ?? 'div';

  return (
    <Component
      className={cn(
        'rounded-card border',
        toneClass[tone],
        elevationClass[elevation],
        interactive && 'lift-on-hover',
        className,
      )}
      {...props}
    />
  );
}
