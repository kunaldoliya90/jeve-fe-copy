import { type DefaultOptions, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/http/errors';
import { logger } from '@/lib/logger';

/**
 * Server-state defaults.
 *
 * The important decision here is the retry predicate: React Query's default
 * retries every failure three times, which turns a 404 or a validation error
 * into four identical round trips and a four-times-slower error message.
 */
const RETRYABLE_ATTEMPTS = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= RETRYABLE_ATTEMPTS) return false;
  // Only transient failures are worth repeating; a 4xx will fail identically.
  if (error instanceof ApiError) return error.isRetryable;
  return true;
}

const defaultOptions: DefaultOptions = {
  queries: {
    // Treat data as fresh for a minute: stops the refetch storm when a user
    // tabs between screens, without going stale enough to mislead.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: shouldRetry,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    throwOnError: false,
  },
  mutations: {
    // A mutation is not idempotent by default, so never retry it blindly.
    retry: false,
    onError: (error) => {
      logger.error('Mutation failed.', error);
    },
  },
};

export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions });
}

/** Singleton for the running app. Tests should call `createQueryClient()`. */
export const queryClient = createQueryClient();
