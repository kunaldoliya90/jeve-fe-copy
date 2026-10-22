import { useNavigate, useSearchParams } from 'react-router';

import { paths } from '@/config/paths';
import { LoginForm } from '@/features/auth';

/**
 * Pages stay thin: read the route, render features, own the navigation. All
 * behaviour lives in the feature, which keeps pages trivially reviewable.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTo = searchParams.get('redirectTo');

  return (
    <LoginForm
      onSuccess={() => {
        void navigate(redirectTo ?? paths.app.dashboard.getHref(), { replace: true });
      }}
    />
  );
}
