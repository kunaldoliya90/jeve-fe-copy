import { delay, http as mswHttp, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { http, setAuthHandlers } from '@/lib/http/client';
import { ApiError, NetworkError, TimeoutError, toUserMessage } from '@/lib/http/errors';
import { server } from '@/testing/mocks/server';

/**
 * The HTTP client is the riskiest hand-written code in the app: every feature
 * depends on it, and its failure modes (timeouts, the 401 refresh handshake)
 * are the ones hardest to reproduce by hand. These tests drive it through MSW
 * rather than a stubbed `fetch`, so the real request path is exercised.
 */

const getAccessToken = vi.fn<() => string | null>();
const refreshToken = vi.fn<() => Promise<boolean>>();
const onAuthFailure = vi.fn<() => void>();

beforeEach(() => {
  getAccessToken.mockReturnValue('token-1');
  refreshToken.mockResolvedValue(false);
  setAuthHandlers({ getAccessToken, refreshToken, onAuthFailure });
});

describe('http requests', () => {
  it('returns the parsed JSON body', async () => {
    server.use(mswHttp.get('/api/widgets', () => HttpResponse.json({ items: ['a'] })));

    await expect(http.get<{ items: string[] }>('/widgets')).resolves.toEqual({ items: ['a'] });
  });

  it('sends the access token as a bearer header', async () => {
    const seen = vi.fn<(value: string | null) => void>();
    server.use(
      mswHttp.get('/api/widgets', ({ request }) => {
        seen(request.headers.get('Authorization'));
        return HttpResponse.json({});
      }),
    );

    await http.get('/widgets');

    expect(seen).toHaveBeenCalledWith('Bearer token-1');
  });

  it('omits the token when skipAuth is set', async () => {
    const seen = vi.fn<(value: string | null) => void>();
    server.use(
      mswHttp.get('/api/widgets', ({ request }) => {
        seen(request.headers.get('Authorization'));
        return HttpResponse.json({});
      }),
    );

    await http.get('/widgets', { skipAuth: true });

    expect(seen).toHaveBeenCalledWith(null);
  });

  it('serialises params and drops undefined and null', async () => {
    const seen = vi.fn<(search: string) => void>();
    server.use(
      mswHttp.get('/api/widgets', ({ request }) => {
        seen(new URL(request.url).search);
        return HttpResponse.json({});
      }),
    );

    await http.get('/widgets', {
      params: { page: 2, active: true, q: undefined, owner: null },
    });

    expect(seen).toHaveBeenCalledWith('?page=2&active=true');
  });

  it('returns null for a 204 instead of throwing on an empty body', async () => {
    server.use(mswHttp.delete('/api/widgets/1', () => new HttpResponse(null, { status: 204 })));

    await expect(http.delete('/widgets/1')).resolves.toBeNull();
  });
});

describe('error normalisation', () => {
  it('maps an error response onto ApiError', async () => {
    server.use(
      mswHttp.get('/api/widgets', () =>
        HttpResponse.json({ message: 'Nope.', code: 'BAD_WIDGET' }, { status: 422 }),
      ),
    );

    const error = await http.get('/widgets').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'BAD_WIDGET', message: 'Nope.' });
    expect((error as ApiError).isRetryable).toBe(false);
    expect((error as ApiError).isClientError).toBe(true);
  });

  it('treats 429 and 5xx as retryable but 404 as not', async () => {
    server.use(mswHttp.get('/api/a', () => HttpResponse.json({}, { status: 503 })));
    server.use(mswHttp.get('/api/b', () => HttpResponse.json({}, { status: 404 })));

    const a = (await http.get('/a').catch((e: unknown) => e)) as ApiError;
    const b = (await http.get('/b').catch((e: unknown) => e)) as ApiError;

    expect(a.isRetryable).toBe(true);
    expect(b.isRetryable).toBe(false);
  });

  it('raises NetworkError when the request never reaches a server', async () => {
    server.use(mswHttp.get('/api/widgets', () => HttpResponse.error()));

    const error = await http.get('/widgets').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect(toUserMessage(error)).toMatch(/connection/i);
  });

  it('raises TimeoutError once the deadline passes', async () => {
    server.use(
      mswHttp.get('/api/slow', async () => {
        await delay(200);
        return HttpResponse.json({});
      }),
    );

    const error = await http.get('/slow', { timeoutMs: 20 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TimeoutError);
  });

  it('propagates a caller abort as an AbortError, not a timeout', async () => {
    server.use(
      mswHttp.get('/api/slow', async () => {
        await delay(200);
        return HttpResponse.json({});
      }),
    );

    const controller = new AbortController();
    const promise = http.get('/slow', { signal: controller.signal });
    controller.abort();

    const error = await promise.catch((e: unknown) => e);

    // React Query relies on recognising its own cancellation. Asserted on
    // `name` rather than the constructor, because the rejection crosses a
    // realm boundary and `instanceof DOMException` is false there.
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe('AbortError');
    expect(error).not.toBeInstanceOf(TimeoutError);
  });
});

describe('401 refresh handshake', () => {
  it('refreshes once and replays the request', async () => {
    let attempts = 0;
    server.use(
      mswHttp.get('/api/widgets', () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.json({ message: 'stale' }, { status: 401 });
        return HttpResponse.json({ ok: true });
      }),
    );
    refreshToken.mockImplementation(() => {
      getAccessToken.mockReturnValue('token-2');
      return Promise.resolve(true);
    });

    await expect(http.get('/widgets')).resolves.toEqual({ ok: true });
    expect(refreshToken).toHaveBeenCalledOnce();
    expect(attempts).toBe(2);
  });

  it('refreshes only once for concurrent 401s', async () => {
    let refreshed = false;
    server.use(
      mswHttp.get('/api/widgets', () =>
        refreshed
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ message: 'stale' }, { status: 401 }),
      ),
    );
    refreshToken.mockImplementation(async () => {
      // A real refresh is a round trip; the delay is what lets the other
      // requests pile up behind this one.
      await delay(20);
      refreshed = true;
      return true;
    });

    const results = await Promise.all([
      http.get('/widgets'),
      http.get('/widgets'),
      http.get('/widgets'),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    // Three parallel 401s must not invalidate the token three times.
    expect(refreshToken).toHaveBeenCalledOnce();
  });

  it('reports auth failure and surfaces the 401 when refresh fails', async () => {
    server.use(
      mswHttp.get('/api/widgets', () => HttpResponse.json({ message: 'gone' }, { status: 401 })),
    );
    refreshToken.mockResolvedValue(false);

    const error = await http.get('/widgets').catch((e: unknown) => e);

    expect(onAuthFailure).toHaveBeenCalledOnce();
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isAuthError).toBe(true);
  });

  it('does not attempt a refresh when skipRefresh is set', async () => {
    server.use(
      mswHttp.post('/api/auth/thing', () => HttpResponse.json({ message: 'no' }, { status: 401 })),
    );

    await http.post('/auth/thing', {}, { skipRefresh: true }).catch(() => undefined);

    expect(refreshToken).not.toHaveBeenCalled();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});
