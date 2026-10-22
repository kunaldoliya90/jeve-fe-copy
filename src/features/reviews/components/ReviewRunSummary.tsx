/**
 * What a *past* review cost to produce, for a page opened after the fact.
 *
 * The step-by-step panel exists to be watched. Its events live on the running
 * orchestrator and are gone once the review ends, so a reviewer opening
 * yesterday's result has no stream to replay — and showing them the seven
 * empty phases would be worse than showing nothing: the first phase would read
 * "running", every other would read as pending, and all of it would be false.
 *
 * So a finished review with no stream gets this instead. It reports only what
 * the stored record actually knows — how long it took, what it spent, and how
 * it ended — and says plainly why the trace is not there, rather than leaving
 * a reader to conclude the review was never done.
 */

import { Clock, Coins, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router';

import { Card } from '@/components/ui';
import { paths } from '@/config/paths';
import { formatElapsed } from '@/hooks/useElapsed';

import { formatUsd, type ReviewDetail } from '../types';

export function ReviewRunSummary({ review }: { review: ReviewDetail }) {
  const { cost } = review;
  const checks = review.areas.reduce((total, area) => total + area.checks.length, 0);
  const reused = review.reused_from !== null;

  return (
    <Card tone="feature" elevation="lift" className="hairline-top p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Review complete
          </h2>
          <p className="mt-1.5 text-lg leading-snug font-medium text-balance text-foreground">
            {review.headline || 'This review finished. The report is below.'}
          </p>
        </div>
      </div>

      {reused ? <Reused from={review.reused_from ?? ''} /> : null}

      {reused ? (
        <p className="mt-4 text-[10px] font-semibold tracking-[0.1em] text-subtle-foreground uppercase">
          What the original review took
        </p>
      ) : null}

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <Metric
          icon={Clock}
          label="Took"
          value={cost.duration_ms > 0 ? formatElapsed(cost.duration_ms) : '-'}
        />
        <Metric
          icon={Sparkles}
          label="Model calls"
          value={cost.ai_calls === 0 ? 'none' : String(cost.ai_calls)}
        />
        <Metric
          icon={Coins}
          label="Spent"
          value={formatUsd(cost.total_usd)}
          hint={cost.ai_calls === 0 ? 'Every figure came from arithmetic' : undefined}
        />
        {checks > 0 ? <Metric label="Checks run" value={String(checks)} /> : null}
      </dl>

      {/* Redundant once the reuse note above has explained why there is no
          trace, and the two together read as two different excuses. */}
      {reused ? null : (
        <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
          The step-by-step trace is kept only while a review is running, so it is not available for
          this one. Nothing is missing from the result itself: the report below is the stored
          record, and section 5 breaks the cost down by step.
        </p>
      )}
    </Card>
  );
}

/**
 * Said plainly, because the alternative is a reviewer wondering what happened.
 *
 * An upload that returns a finished report in under a second has not been
 * reviewed quickly — it has not been reviewed at all this time. The file was
 * byte for byte identical to one already put through the same rules, so the
 * findings are that review's findings. They are no less valid for it, and the
 * saving is real, but the reader has to be told which of the two they are
 * looking at.
 */
function Reused({ from }: { from: string }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card border border-info/30 bg-info/[0.07] px-3 py-2.5 text-xs leading-relaxed text-foreground">
      <Zap aria-hidden="true" className="size-3.5 shrink-0 text-info" />
      <span>
        This file was byte for byte identical to one already reviewed under the same rules, so the
        findings below are that review&rsquo;s. This upload re-read nothing and cost nothing; the
        figures beneath are what the original review took and spent.
      </span>
      <Link
        to={paths.app.reviewDetail.getHref(from)}
        className="press font-medium text-primary underline-offset-4 hover:underline"
      >
        Open the original
      </Link>
    </p>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: typeof Clock | undefined;
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-subtle-foreground uppercase">
        {Icon ? <Icon aria-hidden="true" className="size-3" /> : null}
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-foreground tabular-nums">{value}</dd>
      {hint ? <p className="mt-0.5 text-[11px] text-subtle-foreground">{hint}</p> : null}
    </div>
  );
}
