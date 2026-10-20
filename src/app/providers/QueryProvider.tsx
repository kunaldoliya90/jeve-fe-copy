import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, type ReactNode, Suspense } from 'react';

import { env } from '@/config/env';
import { queryClient } from '@/lib/query/queryClient';

// Lazily imported, and gated on `isDev`. The package also self-stubs to
// `() => null` in a production build, so this costs nothing when shipped.
const Devtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((module) => ({
    default: module.ReactQueryDevtools,
  })),
);

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {env.isDev ? (
        <Suspense fallback={null}>
          <Devtools buttonPosition="bottom-right" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
