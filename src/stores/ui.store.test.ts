import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '@/stores/ui.store';

beforeEach(() => {
  useUiStore.setState({ theme: 'system', sidebarCollapsed: false });
});

describe('useUiStore', () => {
  it('sets the theme', () => {
    useUiStore.getState().setTheme('dark');

    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('toggles the sidebar', () => {
    const { toggleSidebar } = useUiStore.getState();

    toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);

    toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('sets the sidebar state explicitly', () => {
    useUiStore.getState().setSidebarCollapsed(true);

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('persists the preference so a reload keeps it', () => {
    useUiStore.getState().setTheme('light');

    // The store is persisted under this key; losing it would silently reset
    // every user's preference on the next deploy.
    const raw = window.localStorage.getItem('jeve.ui.theme');

    expect(raw).toContain('light');
  });
});
