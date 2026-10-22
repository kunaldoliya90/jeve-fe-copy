/**
 * Server state for reviews.
 *
 * A review is background work, so the detail query polls while it is running
 * and stops the moment it is not. Progress arrives over SSE; this polling is
 * the belt to that braces — if the stream drops, the page still finishes.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { isFinished, type JETypeView, type ReviewDetail, type ReviewSummary } from '../types';
import { deleteReview, getReview, listJeTypes, listReviews, uploadWorkbook } from './reviews.api';

/**
 * How often to re-ask for a running review.
 *
 * Two rates, because the poll is doing two different jobs. With no stream it
 * is the only thing moving the page forward, so it has to be quick. With a
 * healthy stream it is purely a backstop against a silent drop, and a full
 * review detail — every area, every check, every metered call — fetched every
 * two seconds to learn what the stream already said is waste at both ends.
 */
const POLL_MS = 2_000;
const BACKSTOP_POLL_MS = 15_000;

/** The list only carries a status and a score, and nobody watches it tick. */
const LIST_POLL_MS = 5_000;

export const reviewKeys = {
  all: ['reviews'] as const,
  list: () => [...reviewKeys.all, 'list'] as const,
  detail: (id: string) => [...reviewKeys.all, 'detail', id] as const,
  jeTypes: () => ['je-types'] as const,
};

export interface UseReviewOptions {
  /**
   * True while the SSE stream is delivering. Backs the poll off to a
   * backstop rate; see `POLL_MS` above.
   */
  streaming?: boolean | undefined;
}

export function useReview(reviewId: string | undefined, options: UseReviewOptions = {}) {
  const interval = options.streaming === true ? BACKSTOP_POLL_MS : POLL_MS;

  return useQuery<ReviewDetail>({
    queryKey: reviewKeys.detail(reviewId ?? ''),
    queryFn: () => {
      // `enabled` below guarantees this, but the type cannot know it.
      if (!reviewId) throw new Error('useReview called without a review id');
      return getReview(reviewId);
    },
    enabled: Boolean(reviewId),
    // Live work must not be served from cache, or the page shows a stale step.
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isFinished(status) ? false : interval;
    },
  });
}

/**
 * Fetches the review again the instant the stream says it has ended.
 *
 * This is what makes the backed-off poll above safe: the final report is not
 * waited for on a fifteen-second timer, it is asked for the moment the
 * terminal event lands. The poll only ever has to catch a stream that died
 * without saying so.
 */
export function useRefreshOnFinish(reviewId: string | undefined, finished: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!reviewId || !finished) return;

    void queryClient.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
    // The row in the recent list is now out of date too.
    void queryClient.invalidateQueries({ queryKey: reviewKeys.list() });
  }, [finished, queryClient, reviewId]);
}

export function useReviewList() {
  return useQuery<ReviewSummary[]>({
    queryKey: reviewKeys.list(),
    queryFn: listReviews,
    staleTime: 0,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((row) => !isFinished(row.status)) ? LIST_POLL_MS : false,
  });
}

export function useUploadWorkbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadWorkbook,
    onSuccess: () => {
      // The new review is running, so the list is immediately out of date.
      void queryClient.invalidateQueries({ queryKey: reviewKeys.list() });
    },
  });
}

/**
 * Withdraw one review.
 *
 * The row is removed from the cached list immediately rather than waiting for
 * a refetch. A list that keeps showing a review for the half-second after it
 * was deleted invites a second click, and the second click gets a 404 for
 * something that worked — so the optimistic removal here is about correctness
 * as much as it is about feel.
 *
 * `onSettled` re-reads the list either way: on success to pick up anything
 * that changed server-side alongside the delete, and on failure to put the row
 * back exactly as the server still has it rather than as this client guessed.
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReview,
    onMutate: (reviewId: string) => {
      queryClient.setQueryData<ReviewSummary[]>(reviewKeys.list(), (rows) =>
        rows?.filter((row) => row.review_id !== reviewId),
      );
    },
    onSuccess: (_data, reviewId) => {
      // Nothing may answer from this review's cache afterwards: a detail page
      // opened from history would otherwise render a review that is gone.
      queryClient.removeQueries({ queryKey: reviewKeys.detail(reviewId) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.list() });
    },
  });
}

/** The review plan. Versioned context files, so it is stable for a whole deployment. */
export function useJeTypes() {
  return useQuery<JETypeView[]>({
    queryKey: reviewKeys.jeTypes(),
    queryFn: listJeTypes,
    staleTime: Infinity,
  });
}
