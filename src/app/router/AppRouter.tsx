import { Suspense } from 'react';
import { RouterProvider } from 'react-router';

import { router } from '@/app/router/routes';
import { PageLoader } from '@/components/common/PageLoader';

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
