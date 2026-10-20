import { useEffect } from 'react';

import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/AppRouter';
import { useAuthStore } from '@/features/auth';

export function App() {
  const initialise = useAuthStore((state) => state.initialise);

  // Trade the refresh cookie for an access token before the router decides
  // whether the user may see a protected route.
  useEffect(() => {
    void initialise();
  }, [initialise]);

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
