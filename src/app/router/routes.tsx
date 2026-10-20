import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { PublicOnlyRoute } from '@/app/router/PublicOnlyRoute';
import { RouteErrorBoundary } from '@/app/router/RouteErrorBoundary';
import { paths } from '@/config/paths';

/**
 * Route table.
 *
 * Pages are lazy so each route ships as its own chunk and the initial bundle
 * stays small; layouts and guards are eager because every route needs them.
 * `errorElement` on the root means a thrown loader/render error shows a
 * fallback inside the app rather than blanking the page.
 */
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const routes: RouteObject[] = [
  {
    path: paths.home.path,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to={paths.app.dashboard.getHref()} replace /> },

      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [{ path: paths.auth.login.path, element: <LoginPage /> }],
          },
        ],
      },

      {
        element: <ProtectedRoute />,
        children: [
          {
            path: paths.app.root.path,
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to={paths.app.dashboard.getHref()} replace /> },
              { path: paths.app.dashboard.path, element: <DashboardPage /> },
            ],
          },
        ],
      },

      { path: paths.notFound.path, element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
