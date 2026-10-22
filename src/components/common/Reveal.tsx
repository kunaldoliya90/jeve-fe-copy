import { type ComponentProps, type ElementType, useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/utils/cn';

export interface RevealProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** Stagger position within a group. Capped, so a long list stays quick. */
  index?: number | undefined;
  as?: ElementType | undefined;
}

/**
 * Fades and lifts its children into view the first time they are scrolled to.
 *
 * An `IntersectionObserver` rather than a scroll listener: the browser does
 * the intersection maths off the main thread, so a report with forty of these
 * costs nothing while scrolling, where forty scroll handlers would cost a
 * frame each. The observer disconnects on first hit — a section that has
 * already appeared must never animate again when the user scrolls back.
 *
 * Only `opacity` and `transform` move, so no reveal triggers layout.
 *
 * The two cases where there is nothing to animate — reduced motion, and no
 * observer at all — are decided during render rather than in the effect.
 * Deriving them means the content is visible on the very first paint, where
 * setting state from an effect would render it invisible once first and
 * cascade a second render to undo that.
 *
 * Every other prop is forwarded. That is not convenience: with `as="section"`
 * the caller is making this element a landmark, and an `aria-labelledby` that
 * this component quietly swallowed would leave that landmark unnamed.
 */
export function Reveal({ children, index = 0, as, className, style, ...rest }: RevealProps) {
  const Component = as ?? 'div';
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const [intersected, setIntersected] = useState(false);

  // A missing observer (jsdom, a very old browser) must leave the content
  // showing. A blank page is a far worse failure than a missing animation.
  const canObserve = typeof IntersectionObserver !== 'undefined';
  const shown = reduceMotion || !canObserve || intersected;

  useEffect(() => {
    if (reduceMotion || !canObserve) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIntersected(true);
          observer.disconnect();
        }
      },
      // A little past the fold, so the motion has finished by the time the
      // element is actually being read.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [canObserve, reduceMotion]);

  return (
    <Component
      ref={ref}
      className={cn(
        // The `reveal` class is the hook the print stylesheet overrides. A
        // section whose observer has never fired is at `opacity: 0`, and
        // without that override a report printed without scrolling to the
        // bottom first comes out with every section below the fold blank.
        'reveal transition-[opacity,transform] duration-[520ms] ease-out-soft',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        className,
      )}
      style={{ transitionDelay: `${String(Math.min(index, 8) * 55)}ms`, ...style }}
      {...rest}
    >
      {children}
    </Component>
  );
}
