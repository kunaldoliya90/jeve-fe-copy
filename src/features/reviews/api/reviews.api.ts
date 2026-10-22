/**
 * Calls to the review endpoints.
 *
 * Upload goes through `fetch` directly rather than the shared client: it sends
 * `FormData`, needs no auth header, and wants the server's own error body
 * rather than a normalised one — the error code (`not_excel`, `too_large`) is
 * what the UI shows the user.
 */

import { env } from '@/config/env';
import { http } from '@/lib/http';
import { ApiError, toUserMessage } from '@/lib/http/errors';

import type { JETypeView, ReviewAccepted, ReviewDetail, ReviewSummary } from '../types';

const BASE = '/jeve/reviews/';

/** The server's error shape. Narrowed defensively — a proxy may return HTML. */
interface ApiErrorBody {
  detail?: { error_code?: string; message?: string; details?: Record<string, string> };
}

export class ReviewUploadError extends Error {
  readonly code: string;
  readonly details: Record<string, string>;

  constructor(code: string, message: string, details: Record<string, string> = {}) {
    super(message);
    this.name = 'ReviewUploadError';
    this.code = code;
    this.details = details;
  }
}

/** Human wording for the codes the gatekeeper can return. */
const MESSAGES: Record<string, string> = {
  not_excel: 'That file is not an Excel workbook. Upload an .xlsx, .xlsm or .xlsb file.',
  too_large: 'That workbook is above the upload limit.',
  corrupt_workbook: 'That workbook could not be opened. It may be damaged.',
  at_capacity: 'Too many reviews are running right now. Try again in a moment.',
};

export async function uploadWorkbook(input: {
  file: File;
  jeType?: string;
}): Promise<ReviewAccepted> {
  const form = new FormData();
  form.append('workbook', input.file);
  if (input.jeType) form.append('je_type', input.jeType);

  const response = await fetch(`${env.VITE_API_BASE_URL}${BASE}`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    const code = body.detail?.error_code ?? 'internal';
    throw new ReviewUploadError(
      code,
      MESSAGES[code] ?? body.detail?.message ?? 'The upload could not be accepted.',
      body.detail?.details ?? {},
    );
  }

  return (await response.json()) as ReviewAccepted;
}

export function getReview(reviewId: string): Promise<ReviewDetail> {
  return http.get<ReviewDetail>(`${BASE}${reviewId}/`);
}

export function listReviews(): Promise<ReviewSummary[]> {
  return http.get<ReviewSummary[]>(BASE);
}

/** Absolute URL for the progress stream. `EventSource` cannot take a relative base. */
export function eventsUrl(reviewId: string): string {
  return `${env.VITE_API_BASE_URL}${BASE}${reviewId}/events/`;
}

export function listJeTypes(): Promise<JETypeView[]> {
  return http.get<JETypeView[]>('/jeve/je-types/');
}

/**
 * Withdraw one stored review.
 *
 * Returns nothing: the server answers 204, and there is no such thing as a
 * partial delete to report on — the record, its listing row, its reuse entry
 * and the worker's cached copy all go, or the call fails.
 */
export function deleteReview(reviewId: string): Promise<null> {
  return http.delete<null>(`${BASE}${reviewId}/`);
}

/**
 * What to tell the user when a delete is refused.
 *
 * The shared client reads `message` and `code` from the top of an error body,
 * and this service nests both under `detail` — so an `ApiError` from here
 * arrives carrying "Request failed with status 409" and nothing else useful.
 * Rather than loosen the client for one endpoint, the envelope is unwrapped
 * here, where the shape is already known.
 *
 * The status is the fallback and not the primary source, because 409 and 404
 * mean quite different things to someone who has just pressed Delete: one is
 * "not yet", the other is "already done".
 */
export function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const nested = (error.details as ApiErrorBody | undefined)?.detail;
    if (nested?.message) return nested.message;

    if (error.status === 409) {
      return 'This review is still running. It can be deleted once it finishes.';
    }
    if (error.status === 404) {
      return 'That review has already been deleted.';
    }
  }

  return toUserMessage(error);
}
