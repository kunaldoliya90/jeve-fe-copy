import { http, HttpResponse } from 'msw';

import type { Session, User } from '@/features/auth';

/**
 * Default request handlers, shared by the browser worker (dev) and the Node
 * server (tests). Individual tests override these with `server.use(...)`
 * rather than editing this file, so the happy path stays the default.
 */
const API = '/api';

export const mockUser: User = {
  id: 'usr_1',
  email: 'test.user@example.com',
  name: 'Test User',
  roles: ['user'],
};

export const mockSession: Session = {
  user: mockUser,
  tokens: { accessToken: 'mock-access-token', expiresIn: 900 },
};

/**
 * Stands in for the HttpOnly refresh cookie.
 *
 * Without this, `/auth/refresh` would succeed on a cold load and the app would
 * start up already signed in — which hides every auth-guard bug and makes the
 * unauthenticated path untestable.
 */
let hasRefreshCookie = false;

/** Reset between tests, so one test's login cannot authenticate the next. */
export function resetMockSession(): void {
  hasRefreshCookie = false;
}

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email !== mockUser.email) {
      return HttpResponse.json(
        { message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    hasRefreshCookie = true;
    return HttpResponse.json(mockSession);
  }),

  http.post(`${API}/auth/refresh`, () => {
    if (!hasRefreshCookie) {
      return HttpResponse.json({ message: 'No active session.' }, { status: 401 });
    }
    return HttpResponse.json(mockSession);
  }),

  http.post(`${API}/auth/logout`, () => {
    hasRefreshCookie = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/auth/me`, ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }
    return HttpResponse.json(mockUser);
  }),
];
