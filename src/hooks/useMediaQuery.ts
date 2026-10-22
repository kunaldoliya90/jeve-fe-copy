import { useCallback, useSyncExternalStore } from 'react';

import { type Breakpoint, BREAKPOINTS } from '@/config/constants';

/**
 * Subscribe to a media query.
 *
 * `useSyncExternalStore` is the right primitive here: matchMedia *is* an
 * external store. A `useState` + `useEffect` version has to call setState in
 * the effect body to catch a changed query, which cascades an extra render
 * and can tear during concurrent rendering.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => {
        list.removeEventListener('change', onStoreChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Server snapshot: no viewport during SSR/prerender, so report "no match".
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** True when the viewport is at or above the given Tailwind breakpoint. */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
}
