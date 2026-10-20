/**
 * Every route in the app, in one place.
 *
 * Routes are declared as functions so call sites get compile-time checking of
 * their parameters: `paths.app.userDetail.getHref('42')` cannot silently
 * produce `/users/undefined`. Never hand-write a route string elsewhere.
 */
export const paths = {
  home: {
    path: '/',
    getHref: () => '/',
  },

  auth: {
    login: {
      path: '/login',
      getHref: (redirectTo?: string) =>
        redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login',
    },
  },

  app: {
    root: {
      path: '/app',
      getHref: () => '/app',
    },
    dashboard: {
      path: 'dashboard',
      getHref: () => '/app/dashboard',
    },
  },

  notFound: {
    path: '*',
    getHref: () => '/404',
  },
} as const;
