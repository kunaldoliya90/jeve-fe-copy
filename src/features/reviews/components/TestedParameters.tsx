/**
 * Every parameter the entry was tested on, what each one came to, and the
 * checks that decided it.
 *
 * A card shows a status *and* a score because they answer different questions.
 * An exception-rate area with three bad rows in forty thousand scores in the
 * nineties and still contains a failure, so the badge comes from the area's
 * worst check and the number from the weighted arithmetic. Reading only one of
 * them is how a failure gets signed off.
 *
 * The checks beneath each parameter are the point of the section. The score is
 * an aggregate, and an aggregate is not an explanation — "Period and cut-off:
 * 40" tells a reviewer nothing they can act on, where "the methodology tab has
 * no period stamp for period 08" tells them what to go and get. Each check
 * carries its own question, what it concluded, how many exceptions it found,
 * what that is worth, and which cells it looked at.
 *
 * Laid out the way `ReviewPlan` lays out the same entry type before a review
 * runs — area, then its checks — so the plan and the result read as two views
 * of one thing rather than two different documents.
 *
 * Nothing here is collapsed behind a disclosure. This report is printed and
 * circulated, and a check hidden in a closed panel prints as a blank.
 */

import { Badge, Card, ProgressBar } from '@/components/ui';
import { cn } from '@/utils/cn';

import { STATUS_TEXT, STATUS_TONE } from '../lib/status';
import {
  AREA_LABELS,
  type AreaView,
  type CheckStatus,
  type CheckView,
  METHOD_LABELS,
  type ReviewDetail,
  STATUS_LABELS,
} from '../types';
import { CheckFacts, ReviewReasons } from './CheckFacts';
import { Prose } from './Prose';
import { Section } from './Section';

/* -------------------------------------------------------------------------- */
/*  Checks held back from the report                                           */
/* -------------------------------------------------------------------------- */

/**
 * Questions the business has asked not to show on the report for now.
 *
 * Matched on the question rather than on the check id because the ids are the
 * engine's and are not published to this codebase. That is the weaker join of
 * the two, and deliberately the weaker *direction*: if the engine rewords one
 * of these, the check reappears on the report — visible, and obviously in need
 * of a line here — where an id that silently stopped matching would hide a
 * check nobody meant to hide. Swap this for ids the moment they are known.
 *
 * Applied to the observations only, never to a check that carries weight.
 * Hiding a scored row would leave a parameter badged "Fail" above a list in
 * which everything passed, and a check count that disagrees with the rows
 * under it — a report that argues with itself. If one of these ever arrives
 * as a scored check it belongs in the entry type's plan, not behind a filter
 * here.
 */
const WITHHELD_QUESTIONS: readonly string[] = [
  'Does the methodology tab state the same period the entry posts in?',
  'Are numbers typed over formulas explained?',
  'Where does personal data appear, and is it expected on that tab?',
];

const WITHHELD = new Set(WITHHELD_QUESTIONS.map(normalise));

function normalise(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

function listed(check: CheckView): boolean {
  return !WITHHELD.has(normalise(check.question));
}

/* -------------------------------------------------------------------------- */
/*  The section                                                                */
/* -------------------------------------------------------------------------- */

/** The three a reader counts. The two unproven statuses are not failures. */
const COUNTED: readonly { status: CheckStatus; label: string }[] = [
  { status: 'pass', label: 'Pass' },
  { status: 'fail', label: 'Fail' },
  { status: 'partial', label: 'Partial' },
];

export function TestedParameters({ review, index }: { review: ReviewDetail; index: number }) {
  const { areas } = review;
  const observations = review.observations.filter(listed);

  if (areas.length === 0 && observations.length === 0) return null;

  return (
    <Section
      index={index}
      id="parameters"
      title="Key tested parameters"
      aside={
        review.score !== null ? (
          <span>
            Weighted score{' '}
            <span className="font-semibold text-foreground tabular-nums">{review.score}</span>
          </span>
        ) : null
      }
    >
      <Tally areas={areas} />

      <ol className="mt-4 space-y-3">
        {areas.map((area, index) => (
          <ParameterCard key={area.area} area={area} index={index} />
        ))}
      </ol>

      {observations.length > 0 ? <Observations checks={observations} index={areas.length} /> : null}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        A parameter is badged by its worst check and scored by its weight. Unproven and no evidence
        are kept apart from fail on purpose: nothing was established, versus nothing was supplied,
        and a reviewer acts on them differently.
      </p>
    </Section>
  );
}

function Tally({ areas }: { areas: AreaView[] }) {
  const unproven = areas.filter(
    (area) => area.status === 'unable_to_validate' || area.status === 'missing_evidence',
  ).length;

  return (
    <div role="group" aria-label="Parameter outcomes">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {COUNTED.map(({ status, label }) => (
          <div key={status}>
            <dt
              className={cn(
                'text-[11px] font-semibold tracking-wide uppercase',
                STATUS_TEXT[status],
              )}
            >
              {label}
            </dt>
            <dd className="mt-0.5 text-[1.75rem] leading-none font-semibold text-foreground tabular-nums">
              {areas.filter((area) => area.status === status).length}
            </dd>
          </div>
        ))}
        {unproven > 0 ? (
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Unproven
            </dt>
            <dd className="mt-0.5 text-[1.75rem] leading-none font-semibold text-foreground tabular-nums">
              {unproven}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  One parameter                                                              */
/* -------------------------------------------------------------------------- */

/** The bar under the score. Tone follows the badge, never the number. */
const BAR_TONE: Record<CheckStatus, 'success' | 'warning' | 'danger'> = {
  pass: 'success',
  partial: 'warning',
  unable_to_validate: 'warning',
  missing_evidence: 'warning',
  fail: 'danger',
};

function ParameterCard({ area, index }: { area: AreaView; index: number }) {
  const headingId = `parameter-${area.area}`;
  const label = AREA_LABELS[area.area] ?? area.area;
  const { checks } = area;

  return (
    <li className="stagger" style={{ '--i': index } as React.CSSProperties}>
      <Card as="article" aria-labelledby={headingId} className="overflow-hidden">
        <header className="border-b border-border-hairline bg-surface-muted/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id={headingId} className="text-sm font-semibold text-foreground">
                {label}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {METHOD_LABELS[area.method] ?? area.method}
                {checks.length > 0 ? ` · ${checks.length} check${plural(checks.length)}` : ''}
              </p>
            </div>

            <div className="flex flex-none items-center gap-3">
              <p className="flex items-baseline gap-0.5">
                <span className="text-2xl leading-none font-semibold text-foreground tabular-nums">
                  {area.score}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </p>
              <StatusBadge status={area.status} />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <ProgressBar
              value={area.score}
              tone={BAR_TONE[area.status]}
              label={`${label} scored ${String(area.score)} out of 100`}
              className="flex-1"
            />
            <span
              className="flex-none text-[11px] text-muted-foreground tabular-nums"
              title="How much of the compliance score this parameter can move"
            >
              {area.weight}% of the score
            </span>
          </div>

          {/* The weakest check's own words, inside the verdict block rather
              than above the list: set on the white below, an unbadged line of
              prose reads as a check whose status failed to render. Where the
              engine wrote no reason, nothing is shown — the scoring method is
              already named above, and repeating it here as a finding is what
              made the old card read as though "Weakest check" were something
              the review had concluded. */}
          {area.reason ? (
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              <Prose text={area.reason} />
            </p>
          ) : null}
        </header>

        {checks.length > 0 ? (
          <ul className="divide-y divide-border-hairline">
            {checks.map((check) => (
              <CheckRow key={check.check_id} check={check} />
            ))}
          </ul>
        ) : null}
      </Card>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  One check                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * What one check asked, what it found, and what it looked at.
 */
function CheckRow({ check }: { check: CheckView }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-foreground">
          {check.question || check.check_id}
        </p>
        <StatusBadge status={check.status} />
      </div>

      {check.conclusion ? (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          <Prose text={check.conclusion} />
        </p>
      ) : null}

      <CheckFacts check={check} />

      {/* Said on the check itself as well as in the worklist further down.
          A reviewer reading the parameter has to know this one is not settled;
          finding that out two sections later is finding it out too late. */}
      {check.needs_review ? (
        <>
          <p className="mt-2">
            <Badge tone="warning" size="sm">
              Waiting on a person
            </Badge>
          </p>
          <ReviewReasons reasons={check.review_reasons} />
        </>
      ) : null}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Observations                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Checks that run and are deliberately never scored.
 *
 * Kept apart from the scored parameters rather than mixed in among them. They
 * were previously cards in the same grid, distinguished only by a dashed
 * border and a badge — which left a reader counting eight parameters on a page
 * where six carried the score. Their own list, under their own heading, says
 * what they are once instead of on every card.
 */
function Observations({ checks, index }: { checks: CheckView[]; index: number }) {
  return (
    <section aria-labelledby="observations-heading" className="mt-3">
      <Card
        elevation="flat"
        className="stagger overflow-hidden border-dashed"
        style={{ '--i': index } as React.CSSProperties}
      >
        <div className="border-b border-border-hairline bg-surface-muted/50 px-4 py-3">
          <h3 id="observations-heading" className="text-sm font-semibold text-foreground">
            Also checked, never scored
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reported to the reviewer and carrying no weight. A failure here lowers nothing. It is
            here to be judged, not counted.
          </p>
        </div>

        <ul className="divide-y divide-border-hairline">
          {checks.map((check) => (
            <CheckRow key={check.check_id} check={check} />
          ))}
        </ul>
      </Card>
    </section>
  );
}

function plural(count: number): string {
  return count === 1 ? '' : 's';
}

export function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} size="sm" className="shrink-0">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
