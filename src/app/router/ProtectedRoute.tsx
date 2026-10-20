import { Navigate, Outlet, useLocation } from 'react-router';

import { PageLoader } from '@/components/common/PageLoader';
import { paths } from '@/config/paths';
import { useIsAuthenticated, useIsAuthInitialising } from '@/features/auth';

/**
 * Gate for authenticated routes.
 *
 * Waiting on `isInitialising` is the subtle part: without it, a refresh on a
 * protected URL bounces the user to /login for the moment before the session
 * is restored, losing their place.
 */
export function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated();
  const isInitialising = useIsAuthInitialising();
  const location = useLocation();

  if (isInitialising) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    // Carry the attempted URL so login can return the user to it.
    return <Navigate to={paths.auth.login.getHref(location.pathname)} replace />;
  }

  return <Outlet />;
}
