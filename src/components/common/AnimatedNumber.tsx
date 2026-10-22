import { useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface AnimatedNumberProps {
  value: number;
  /** Decimal places. A compliance score of 62.5 must not count up as 63. */
  decimals?: number | undefined;
  durationMs?: number | undefined;
  className?: string | undefined;
}

/**
 * Counts from zero to a number once, on a single rAF loop.
 *
 * Reserved for a figure that *is* the headline — the compliance score. Rolling
 * every number on a page is a gimmick, and worse, it makes a table unreadable
 * for the second it takes.
 *
 * The animated text is `aria-hidden` and the final value is exposed to
 * assistive tech directly: a screen reader must not read eighty intermediate
 * numbers. A user who asked for reduced motion is given the figure outright,
 * decided during render so the first paint is already correct.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  durationMs = 900,
  className,
}: AnimatedNumberProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [counted, setCounted] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // The same deceleration curve the CSS uses, so a number arriving beside
      // a bar that is filling appears to be driven by the same thing.
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounted(value * eased);

      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame.current);
    };
  }, [durationMs, reduceMotion, value]);

  const exact = value.toFixed(decimals);

  return (
    <span className={className}>
      <span aria-hidden>{reduceMotion ? exact : counted.toFixed(decimals)}</span>
      <span className="sr-only">{exact}</span>
    </span>
  );
}
