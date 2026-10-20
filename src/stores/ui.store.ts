import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/config/constants';

export type Theme = 'light' | 'dark' | 'system';

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
}

interface UiActions {
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

/**
 * Global *client* state only — preferences and chrome.
 *
 * Anything that lives on the server belongs in React Query, not here. Mixing
 * the two is the usual cause of stale-cache bugs, because a store has no
 * notion of invalidation.
 */
export const useUiStore = create<UiState & UiActions>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarCollapsed: false,

      setTheme: (theme) => {
        set({ theme });
      },
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
      setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed });
      },
    }),
    {
      name: STORAGE_KEYS.theme,
      // Persist preferences only; never persist derived or transient state.
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);

/*
 * Selector hooks rather than `useUiStore()` at call sites: subscribing to the
 * whole store re-renders every consumer on any change.
 */
export const useTheme = () => useUiStore((state) => state.theme);
export const useSidebarCollapsed = () => useUiStore((state) => state.sidebarCollapsed);
