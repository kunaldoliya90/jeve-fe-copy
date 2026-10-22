import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/http/errors';

import type { LoginInput } from '../schemas/auth.schema';
import { useAuthStore } from '../stores/auth.store';
import { getCurrentUser, login, logout } from './auth.api';

/**
 * Query keys are centralised per feature and built as a hierarchy, so
 * `invalidateQueries({ queryKey: authKeys.all })` clears everything auth-
 * related without listing each key.
 */
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
};

export function useCurrentUser() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: getCurrentUser,
    // No point asking who the user is before we hold a token.
    enabled: accessToken !== null,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      // A 401 here means the session is gone; retrying cannot fix it.
      if (error instanceof ApiError && error.isAuthError) return false;
      return failureCount < 1;
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (session) => {
      setSession(session);
      // Seed the cache so the first render after login needs no round trip.
      queryClient.setQueryData(authKeys.currentUser(), session.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: logout,
    // Clear locally even if the server call failed: the user asked to leave,
    // and leaving a stale cache behind would leak the previous user's data.
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
