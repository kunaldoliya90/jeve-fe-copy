/**
 * Error types the HTTP client can produce. Call sites discriminate on these
 * instead of inspecting strings, so retry and UI decisions stay type-safe.
 */

/** The server answered with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(
    message: string,
    options: { status: number; code?: string; details?: unknown; cause?: unknown },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }

  /** 401/403 — the caller should re-authenticate rather than retry. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** 4xx other than 408/429 — retrying will not change the outcome. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500 && !this.isRetryable;
  }

  get isRetryable(): boolean {
    return this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

/** The request never produced a response: offline, DNS failure, CORS. */
export class NetworkError extends Error {
  constructor(message = 'Network request failed.', cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'NetworkError';
  }
}

/** The request exceeded its timeout and was aborted by us. */
export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms.`);
    this.name = 'TimeoutError';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Turn any thrown value into a message safe to show a user. Unknown failures
 * get a generic string rather than leaking an internal stack or payload.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TimeoutError) return 'The server took too long to respond. Please retry.';
  if (error instanceof NetworkError) return 'Could not reach the server. Check your connection.';
  return 'Something went wrong. Please try again.';
}
