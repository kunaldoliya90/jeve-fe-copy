/**
 * Public API of the auth feature.
 *
 * Only what is exported here may be imported from outside the feature; ESLint
 * blocks deep imports into `@/features/auth/<anything>`. Keeping the surface
 * small is what lets the internals be refactored without a cross-app sweep.
 */
export { authKeys, useCurrentUser } from './api/auth.queries';
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
export { useAuthStore, useIsAuthenticated, useIsAuthInitialising } from './stores/auth.store';
export type { Session, User } from './types';
