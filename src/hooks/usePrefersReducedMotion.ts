import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * True when the user has asked the OS for less motion.
 *
 * The stylesheet already neutralises CSS animations for these users, but that
 * cannot reach motion driven from JavaScript — a count-up, a staggered
 * reveal, a scroll. Anything animating in a component has to ask.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
