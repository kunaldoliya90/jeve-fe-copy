import { useLogin, useLogout } from '../api/auth.queries';
import {
  useCurrentSessionUser,
  useIsAuthenticated,
  useIsAuthInitialising,
} from '../stores/auth.store';

/**
 * One hook for everything a consumer needs from auth, so components never
 * reach into the store and the queries separately. If the internals change
 * (cookie session, OIDC, whatever), only this file moves.
 *
 * `login`/`logout` are the `mutate` form, which reports failure through
 * `loginError` instead of rejecting. The `*Async` variants reject and must be
 * awaited inside a try/catch — reach for them only when the caller genuinely
 * needs to sequence work after the call.
 */
export function useAuth() {
  const user = useCurrentSessionUser();
  const isAuthenticated = useIsAuthenticated();
  const isInitialising = useIsAuthInitialising();

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  return {
    user,
    isAuthenticated,
    isInitialising,

    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,

    hasRole: (role: string) => user?.roles.includes(role) ?? false,
  };
}
