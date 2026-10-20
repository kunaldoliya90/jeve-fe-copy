import { create } from 'zustand';

import { setAuthHandlers } from '@/lib/http/client';
import { logger } from '@/lib/logger';

import { refreshSession } from '../api/auth.api';
import type { Session, User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** True until the first refresh attempt settles, so routes can wait. */
  isInitialising: boolean;
}

interface AuthActions {
  setSession: (session: Session) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  /** Restore a session from the refresh cookie on app start. */
  initialise: () => Promise<void>;
}

/**
 * The access token is held in memory only — deliberately.
 *
 * Writing it to localStorage makes it readable by any injected script, which
 * turns one XSS into a stolen session. The refresh token lives in an
 * HttpOnly, SameSite cookie the JS never touches, and `initialise()` trades
 * it for a fresh access token on each page load. The cost is one extra
 * request at boot; the benefit is that XSS cannot exfiltrate a long-lived
 * credential.
 */
export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  user: null,
  accessToken: null,
  isInitialising: true,

  setSession: (session) => {
    set({
      user: session.user,
      accessToken: session.tokens.accessToken,
      isInitialising: false,
    });
  },

  setUser: (user) => {
    set({ user });
  },

  clearSession: () => {
    set({ user: null, accessToken: null, isInitialising: false });
  },

  initialise: async () => {
    // Already authenticated (e.g. a second call from a remount) — nothing to do.
    if (get().accessToken !== null) {
      set({ isInitialising: false });
      return;
    }

    try {
      const session = await refreshSession();
      get().setSession(session);
    } catch {
      // No valid refresh cookie is the normal state for an anonymous visitor,
      // so this is not an error worth logging above debug.
      logger.debug('No session to restore.');
      set({ user: null, accessToken: null, isInitialising: false });
    }
  },
}));

/*
 * Wire the store into the HTTP client.
 *
 * This direction is important: the client exposes a setter and knows nothing
 * about auth, while the feature knows about the client. Importing the store
 * from inside the client would create a cycle that breaks tree-shaking and
 * makes the client untestable in isolation.
 */
setAuthHandlers({
  getAccessToken: () => useAuthStore.getState().accessToken,

  refreshToken: async () => {
    try {
      const session = await refreshSession();
      useAuthStore.getState().setSession(session);
      return true;
    } catch (error) {
      logger.debug('Token refresh failed.', error);
      return false;
    }
  },

  onAuthFailure: () => {
    useAuthStore.getState().clearSession();
  },
});

/* Selector hooks — subscribe to one slice, re-render on that slice only. */
export const useCurrentSessionUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.accessToken !== null);
export const useIsAuthInitialising = () => useAuthStore((state) => state.isInitialising);
