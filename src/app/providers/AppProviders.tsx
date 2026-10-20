import type { ReactNode } from 'react';

import { QueryProvider } from '@/app/providers/QueryProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';

/**
 * Single composition point for every cross-cutting provider.
 *
 * Order matters: the boundary is outermost so a provider that throws during
 * setup still renders a fallback instead of a white screen.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorFallback error={error} reset={reset} />
        </div>
      )}
    >
      <QueryProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
