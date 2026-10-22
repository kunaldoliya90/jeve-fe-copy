/**
 * One review: live progress while it runs, then what it found.
 *
 * Progress comes over SSE and the result over a polled query. Both, rather
 * than either: the stream makes it feel live, the poll means a dropped stream
 * still finishes the page. While the stream is healthy the poll backs off to
 * a backstop rate and the report is fetched the moment the terminal event
 * lands, so the page is quick *and* cheap rather than one or the other.
 */

import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { PageLoader } from '@/components/common';
import { Badge, Card } from '@/components/ui';
import { paths } from '@/config/paths';
import {
  isFinished,
  type ReviewDetail,
  ReviewProgress,
  ReviewResult,
  ReviewRunSummary,
  useRefreshOnFinish,
  useReview,
  useReviewProgress,
} from '@/features/reviews';

export default function ReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const progress = useReviewProgress(reviewId ?? null);
  const {
    data: review,
    isPending,
    isError,
    error,
  } = useReview(reviewId, {
    streaming: progress.streaming,
  });

  useRefreshOnFinish(reviewId, progress.finished);

  if (isPending) return <PageLoader />;

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <BackLink />
        <Card tone="danger" className="mt-4 flex items-start gap-3 p-5" role="alert">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <h1 className="text-base font-semibold text-foreground">
              That review could not be loaded
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : 'The review service did not answer. It may still be starting up.'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const done = isFinished(review.status);
  const stopped = review.status === 'failed' || review.status === 'rejected';
  // A review that ended before this page was opened has no stream to show. Its
  // events live on the running orchestrator and are gone, so the seven phases
  // would all render as pending under a heading saying "complete".
  const watched = progress.events.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      <Header review={review} />

      {stopped ? (
        <Card tone="danger" className="flex items-start gap-3 p-5" role="alert">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {review.status === 'rejected'
                ? 'This workbook was not accepted'
                : 'The review did not finish'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {review.headline || 'No result was produced, so nothing below has been assessed.'}
            </p>
          </div>
        </Card>
      ) : done && !watched ? (
        <ReviewRunSummary review={review} />
      ) : (
        <ReviewProgress
          events={progress.events}
          progressPct={review.progress_pct}
          finished={done}
          connectionError={progress.connectionError && !done}
          startedAt={review.created_at}
          meteredUsd={Number(review.cost.total_usd)}
          durationMs={review.cost.duration_ms}
        />
      )}

      {done && review.status !== 'rejected' ? <ReviewResult review={review} /> : null}
    </div>
  );
}

function Header({ review }: { review: ReviewDetail }) {
  const running = !isFinished(review.status);

  return (
    <header className="animate-rise space-y-3">
      <BackLink />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-foreground-strong sm:text-[1.75rem]">
            {review.file_name || 'Review'}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{review.review_id}</span>
            {review.je_type_name ? <span>· {review.je_type_name}</span> : null}
            {review.period ? <span>· {review.period}</span> : null}
          </p>
        </div>

        {running ? (
          <Badge tone="primary" live>
            In progress
          </Badge>
        ) : review.status === 'needs_review' ? (
          <Badge tone="warning">Needs a person</Badge>
        ) : review.status === 'completed' ? (
          <Badge tone="success">Complete</Badge>
        ) : null}
      </div>
    </header>
  );
}

function BackLink() {
  return (
    <Link
      to={paths.app.reviews.getHref()}
      className="inline-flex press items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      All reviews
    </Link>
  );
}
