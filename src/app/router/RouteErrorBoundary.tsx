import { isRouteErrorResponse, useRouteError } from 'react-router';

import { ErrorFallback } from '@/components/common/ErrorFallback';
import { logger } from '@/lib/logger';

/**
 * Router-level `errorElement`. Complements `ErrorBoundary`: the router catches
 * errors thrown by loaders and actions, which a render-phase boundary cannot
 * see.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  logger.error('Route error.', error);

  const normalised = isRouteErrorResponse(error)
    ? new Error(`${error.status} ${error.statusText}`)
    : error instanceof Error
      ? error
      : new Error('Unknown routing error.');

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <ErrorFallback
        error={normalised}
        reset={() => {
          // A full reload is the honest reset here: router error state is not
          // ours to clear, and the route's loader must run again.
          window.location.reload();
        }}
        title="This page could not be loaded"
      />
    </div>
  );
}
