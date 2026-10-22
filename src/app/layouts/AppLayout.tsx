import { Menu } from 'lucide-react';
import { Outlet } from 'react-router';

import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth';
import { useUiStore } from '@/stores/ui.store';

/**
 * Chrome for the authenticated area: header, nav, and the routed outlet.
 *
 * The skip-link is the first focusable element so keyboard users can jump
 * past the navigation on every page.
 */
export function AppLayout() {
  const { user, logout, isLoggingOut } = useAuth();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 glass px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
          className="lg:hidden"
        >
          <Menu aria-hidden="true" />
        </Button>

        <span className="font-semibold tracking-tight text-foreground-strong">
          {env.VITE_APP_NAME}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
          ) : null}
          <ThemeToggle />
          <Button
            variant="secondary"
            size="sm"
            isLoading={isLoggingOut}
            onClick={() => {
              logout();
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
