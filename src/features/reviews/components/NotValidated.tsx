/**
 * The checks nobody has settled either way.
 *
 * The hardest section on the page to get right, because its whole job is to
 * stop a reader drawing the conclusion the layout invites. An unproven check
 * sits between a pass and a fail on the page and means neither: nothing was
 * established. A reader who skims this list and files it under "mostly fine"
 * has been misled by the report rather than by the review.
 *
 * Three things do that work here:
 *
 *  - The framing comes *first*. It used to sit under the list as a footnote,
 *    which is the wrong order — by the time a reader reaches "unproven is not
 *    a near-pass" they have already decided what the list meant.
 *  - Each line is joined back to the check it names, so it reads as a question
 *    somebody has to answer rather than as a status code. See `lib/gaps.ts`.
 *  - Dashed borders throughout. On this report a dashed edge means absence —
 *    the unscored observations, what did not run — and this is the same
 *    statement: there is an outline here and nothing inside it.
 */

import { CircleDashed } from 'lucide-react';

import { Badge, Card } from '@/components/ui';

import { checksById, type Gap, parseGaps } from '../lib/gaps';
import { AREA_LABELS, type ReviewDetail } from '../types';
import { CheckFacts } from './CheckFacts';
import { Prose } from './Prose';
import { StatusBadge } from './TestedParameters';

export function NotValidated({ review }: { review: ReviewDetail }) {
  if (review.gaps.length === 0) return null;

  const gaps = parseGaps(review.gaps, checksById(review));
  // Only an area that was actually scored has a card to jump back to.
  const scored = new Set(review.areas.map((area) => area.area));

  return (
    <section
      id="gaps"
      aria-labelledby="gaps-heading"
      className="scroll-mt-24 space-y-3 defer-paint"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="gaps-heading" className="text-sm font-semibold text-foreground">
          What could not be validated
        </h2>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{gaps.length}</span>{' '}
          {gaps.length === 1 ? 'check' : 'checks'}
        </p>
      </div>

      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
        Unproven is not a near-pass. Nothing below was established either way: not that it is right,
        and not that it is wrong. Each line is a question still open, and the compliance score above
        was reached without an answer to it.
      </p>

      <ol className="space-y-2.5">
        {gaps.map((gap, index) => (
          <li key={gap.key} className="stagger" style={{ '--i': index } as React.CSSProperties}>
            <GapCard gap={gap} linkable={gap.check !== null && scored.has(gap.check.area)} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function GapCard({ gap, linkable }: { gap: Gap; linkable: boolean }) {
  const { check } = gap;

  return (
    <Card elevation="flat" className="border-dashed p-4">
      <div className="flex items-start gap-3">
        <CircleDashed aria-hidden="true" className="mt-0.5 size-4 flex-none text-warning" />

        <div className="min-w-0 flex-1">
          {check === null ? (
            // A line naming no check this review reported. Shown as written,
            // with its identifiers respaced and nothing else touched — the
            // alternative is guessing which check it meant.
            <p className="text-sm leading-relaxed text-foreground">
              <Prose text={gap.line} />
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed font-medium text-foreground">
                  {check.question || check.check_id}
                </p>
                <StatusBadge status={check.status} />
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {AREA_LABELS[check.area] ?? check.area}
              </p>

              {/* What the review did get to, before it stopped. A check listed
                  as unproven with no sentence under it reads as though nobody
                  looked, which is a different and worse claim. */}
              {check.conclusion ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <Prose text={check.conclusion} />
                </p>
              ) : null}

              {/* Why it stopped, where the line carried a reason of its own. */}
              {gap.detail ? (
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  <span className="text-muted-foreground">Could not be settled: </span>
                  <Prose text={gap.detail} />
                </p>
              ) : null}

              <CheckFacts check={check} />

              {check.needs_review || linkable ? (
                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {check.needs_review ? (
                    <Badge tone="warning" size="sm">
                      Waiting on a person
                    </Badge>
                  ) : null}
                  {linkable ? (
                    <a
                      href={`#parameter-${check.area}`}
                      className="press text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      See it under {AREA_LABELS[check.area] ?? check.area}
                    </a>
                  ) : null}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
