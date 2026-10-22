import { http, HttpResponse } from 'msw';

import type { Session, User } from '@/features/auth';
import type { ReviewSummary } from '@/features/reviews';

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

/**
 * Recent reviews, as the listing endpoint returns them.
 *
 * One of each state a row can be in, because the list renders them
 * differently: a finished one is deletable, a running one is not.
 */
export const mockReviews: readonly ReviewSummary[] = [
  {
    review_id: 'rev_20261021T120000_aaaaaaaa',
    file_name: '236264.xlsx',
    je_type: 'vacation-accrual-france',
    status: 'needs_review',
    score: 62.5,
    band: 'Medium risk',
    provisional: true,
    created_at: '2026-10-21T12:00:00Z',
  },
  {
    review_id: 'rev_20261021T110000_bbbbbbbb',
    file_name: '305800.xlsx',
    je_type: 'vacation-accrual-france',
    status: 'completed',
    score: 91,
    band: 'High compliance',
    provisional: false,
    created_at: '2026-10-21T11:00:00Z',
  },
  {
    review_id: 'rev_20261021T100000_cccccccc',
    file_name: 'in-flight.xlsx',
    je_type: 'unknown',
    status: 'running',
    score: null,
    band: null,
    provisional: false,
    created_at: '2026-10-21T10:00:00Z',
  },
];

/** Rows the mock currently holds. Mutated by DELETE, restored between tests. */
let reviews: ReviewSummary[] = [...mockReviews];

/** Reset between tests, so one test's login cannot authenticate the next. */
export function resetMockSession(): void {
  hasRefreshCookie = false;
  reviews = [...mockReviews];
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

  http.get(`${API}/jeve/reviews/`, () => HttpResponse.json(reviews)),

  http.delete(`${API}/jeve/reviews/:reviewId/`, ({ params }) => {
    const { reviewId } = params as { reviewId: string };
    const row = reviews.find((candidate) => candidate.review_id === reviewId);

    if (!row) {
      return HttpResponse.json(
        {
          detail: {
            error_code: 'review_not_found',
            message: `No review with id ${reviewId}`,
          },
        },
        { status: 404 },
      );
    }

    // Mirrors the server: a review still in flight is refused, not deleted.
    if (row.status === 'running' || row.status === 'queued') {
      return HttpResponse.json(
        {
          detail: {
            error_code: 'review_running',
            message: 'This review is still running. It can be deleted once it finishes.',
          },
        },
        { status: 409 },
      );
    }

    reviews = reviews.filter((candidate) => candidate.review_id !== reviewId);
    return new HttpResponse(null, { status: 204 });
  }),
];
