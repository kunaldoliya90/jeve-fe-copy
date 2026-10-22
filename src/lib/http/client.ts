import { env } from '@/config/env';
import { ApiError, NetworkError, TimeoutError } from '@/lib/http/errors';
import { logger } from '@/lib/logger';

/**
 * The app's only HTTP seam.
 *
 * Built on `fetch` rather than a client library so there is no hidden
 * behaviour to reverse-engineer: timeouts, error normalisation, and the
 * 401-refresh handshake are all visible here.
 *
 * Auth is injected rather than imported. The client must not import the auth
 * store, because the auth store calls the client — that cycle is what the
 * `setAuthHandlers` seam exists to break.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  /** Appended as a query string; `undefined` and `null` values are dropped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Serialised as JSON unless it is already a `FormData`/`Blob`/string. */
  body?: unknown;
  /** Overrides `VITE_API_TIMEOUT_MS` for this call. */
  timeoutMs?: number;
  /** Skip the Authorization header (used by login and refresh themselves). */
  skipAuth?: boolean;
  /** Skip the 401 refresh-and-retry handshake for this call. */
  skipRefresh?: boolean;
}

interface AuthHandlers {
  /** Current access token, or null when unauthenticated. */
  getAccessToken: () => string | null;
  /** Attempt a token refresh. Resolve true if a new token is now available. */
  refreshToken: () => Promise<boolean>;
  /** Called when refresh fails and the session is unrecoverable. */
  onAuthFailure: () => void;
}

const noAuth: AuthHandlers = {
  getAccessToken: () => null,
  refreshToken: () => Promise.resolve(false),
  onAuthFailure: () => undefined,
};

let authHandlers: AuthHandlers = noAuth;

/**
 * Wire the auth feature into the client. Called once, from the auth feature's
 * own setup — see `src/features/auth/stores/auth.store.ts`.
 */
export function setAuthHandlers(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

/** Shape the API uses for error responses. Narrowed defensively. */
interface ApiErrorBody {
  message?: unknown;
  code?: unknown;
  details?: unknown;
}

function buildUrl(path: string, params: RequestOptions['params']): string {
  const base = env.VITE_API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${suffix}`;

  if (!params) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }

  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  );
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      // A 200 with a malformed body is a server bug; surface it as such
      // rather than letting `undefined` flow into the UI.
      throw new ApiError('The server returned a malformed response.', {
        status: response.status,
        cause: error,
      });
    }
  }

  return await response.text();
}

function toApiError(response: Response, body: unknown): ApiError {
  const fallback = `Request failed with status ${response.status}.`;

  if (body !== null && typeof body === 'object') {
    const { message, code, details } = body as ApiErrorBody;
    return new ApiError(typeof message === 'string' && message ? message : fallback, {
      status: response.status,
      ...(typeof code === 'string' ? { code } : {}),
      details: details ?? body,
    });
  }

  return new ApiError(typeof body === 'string' && body ? body : fallback, {
    status: response.status,
    details: body,
  });
}

/**
 * Concurrent 401s must trigger exactly one refresh. Everyone else awaits the
 * in-flight promise, otherwise N parallel requests fire N refreshes and the
 * server invalidates the token mid-flight.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= authHandlers.refreshToken().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function execute(
  method: HttpMethod,
  path: string,
  options: RequestOptions,
  isRetry: boolean,
): Promise<unknown> {
  const { params, body, timeoutMs, skipAuth, skipRefresh, headers, signal, ...init } = options;

  const timeout = timeoutMs ?? env.VITE_API_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  // Honour a caller's own cancellation (React Query passes one) alongside ours.
  const abortListener = () => {
    controller.abort();
  };
  signal?.addEventListener('abort', abortListener);

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  const token = skipAuth === true ? null : authHandlers.getAccessToken();
  if (token !== null) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isRawBody(body)) {
      payload = body;
    } else {
      payload = JSON.stringify(body);
      requestHeaders.set('Content-Type', 'application/json');
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...init,
      method,
      headers: requestHeaders,
      ...(payload === undefined ? {} : { body: payload }),
      signal: controller.signal,
    });
  } catch (error) {
    // An abort we caused is a timeout; an abort the caller caused must
    // propagate untouched so React Query can recognise the cancellation.
    //
    // Matched on `name`, not `instanceof DOMException`: the rejection crosses
    // a realm boundary (jsdom vs Node, and iframes or workers in a browser),
    // where the instanceof check is false even though the constructor is
    // DOMException. `name` is the only reliable discriminator here.
    if (error instanceof Error && error.name === 'AbortError') {
      if (signal?.aborted === true) throw error;
      throw new TimeoutError(timeout);
    }
    throw new NetworkError(undefined, error);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortListener);
  }

  const parsed = await parseBody(response);

  if (response.ok) {
    return parsed;
  }

  // One refresh-and-retry attempt per request, and never for the refresh call.
  if (response.status === 401 && skipAuth !== true && skipRefresh !== true && !isRetry) {
    const refreshed = await refreshOnce();

    if (refreshed) {
      logger.debug(`Retrying ${method} ${path} after token refresh.`);
      return await execute(method, path, options, true);
    }

    authHandlers.onAuthFailure();
  }

  throw toApiError(response, parsed);
}

function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  return execute(method, path, options, false) as Promise<T>;
}

/**
 * The return type is the caller's assertion, not a guarantee. For any payload
 * crossing a trust boundary, validate it with the feature's Zod schema rather
 * than relying on the type parameter alone.
 */
export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('GET', path, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),

  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
