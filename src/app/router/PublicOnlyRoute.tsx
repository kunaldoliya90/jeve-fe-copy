import { Navigate, Outlet } from 'react-router';

import { PageLoader } from '@/components/common/PageLoader';
import { paths } from '@/config/paths';
import { useIsAuthenticated, useIsAuthInitialising } from '@/features/auth';

/** Keeps a signed-in user out of /login and similar screens. */
export function PublicOnlyRoute() {
  const isAuthenticated = useIsAuthenticated();
  const isInitialising = useIsAuthInitialising();

  if (isInitialising) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={paths.app.dashboard.getHref()} replace />;

  return <Outlet />;
}
