import { type ReactNode, useEffect } from 'react';

import { useUiStore } from '@/stores/ui.store';

/**
 * Reflects the stored theme preference onto `<html data-theme>`, which is
 * what the CSS in `styles/globals.css` keys off.
 *
 * Applying it via an attribute rather than a React context means no component
 * re-renders on a theme change — the browser just recomputes styles.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      // Remove the override and let `prefers-color-scheme` decide.
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return children;
}
