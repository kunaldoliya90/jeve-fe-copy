/**
 * Every parameter the entry was tested on, and what each one came to.
 *
 * A card shows a status *and* a score because they answer different questions.
 * An exception-rate area with three bad rows in forty thousand scores in the
 * nineties and still contains a failure, so the badge comes from the area's
 * worst check and the number from the weighted arithmetic. Reading only one of
 * them is how a failure gets signed off.
 *
 * Laid out as a grid of compact tiles rather than one full-width card per
 * parameter — a page of these used to run several screens before a reviewer
 * reached the evidence register below it. Each tile is the plain-English
 * reason the score is what it is; the checks behind it are not repeated here
 * at all, never mind behind a disclosure — a reviewer who wants them has the
 * evidence register and the work papers further down the report.
 */

import { CheckCircle2, CircleDashed, CircleSlash2, TriangleAlert, XCircle } from 'lucide-react';

import { Badge, Card } from '@/components/ui';
import { cn } from '@/utils/cn';

import { STATUS_TONE } from '../lib/status';
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

  const working = scoreWorking(areas, review.score);

  return (
    <Section
      index={index}
      id="parameters"
      title="Key tested parameters"
      wash="accent"
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

      {working ? <Working working={working} /> : null}

      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area, index) => (
          <ParameterTile key={area.area} area={area} index={index} />
        ))}
      </ol>

      {observations.length > 0 ? <Observations checks={observations} index={areas.length} /> : null}
    </Section>
  );
}

/**
 * The outcomes, counted.
 *
 * Figures on the section's own ground rather than three bordered tiles. The
 * tiles were a third card style on a page that already carries parameter cards
 * inside a washed section, and a bordered box around a single digit reads as
 * something to click. Colour does the work the borders were doing.
 */

/**
 * The colour each count is set in.
 *
 * Not `STATUS_TEXT`: that map is for a status set in running text, and the
 * warning hue at this size on a light ground is too thin to read — which is
 * why the palette's own warning badge sets its text in `foreground` rather
 * than in `warning`. `accent-strong` is the one warm token that holds its
 * contrast in both themes.
 *
 * Unproven is deliberately not here. It is counted in the ordinary muted grey
 * because nothing was established, which is neither a pass nor a failure, and
 * a colour on it would make it read as one.
 */
const COUNT_TEXT: Record<CheckStatus, string> = {
  pass: 'text-success',
  fail: 'text-danger',
  partial: 'text-accent-strong',
  unable_to_validate: 'text-muted-foreground',
  missing_evidence: 'text-muted-foreground',
};
function Tally({ areas }: { areas: AreaView[] }) {
  const unproven = areas.filter(
    (area) => area.status === 'unable_to_validate' || area.status === 'missing_evidence',
  ).length;

  return (
    <dl
      role="group"
      aria-label="Parameter outcomes"
      className="flex flex-wrap gap-x-12 gap-y-4 pl-1"
    >
      {COUNTED.map(({ status, label }) => (
        <div key={status} className="flex flex-col gap-1">
          <dt className="text-[13px] text-muted-foreground">{label}</dt>
          <dd
            className={cn(
              'text-[1.375rem] leading-none font-semibold tabular-nums',
              COUNT_TEXT[status],
            )}
          >
            {areas.filter((area) => area.status === status).length}
          </dd>
        </div>
      ))}
      {unproven > 0 ? (
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-muted-foreground">Unproven</dt>
          <dd className="text-[1.375rem] leading-none font-semibold text-muted-foreground tabular-nums">
            {unproven}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */
/*  How the score is worked out                                                */
/* -------------------------------------------------------------------------- */

/** One term of the weighted sum: a parameter, or a run of parameters alike. */
interface WorkingTerm {
  label: string;
  /** How many parameters this term stands for. Above one, they are grouped. */
  count: number;
  score: number;
  weight: number;
}

interface ScoreWorking {
  /** The weighted terms, as written. */
  terms: string;
  /** What each term contributes. */
  contributions: string;
  total: string;
}

/**
 * The weighted score, written out as the arithmetic behind it.
 *
 * A reviewer asked to defend a 55 has to be able to add it up, and until this
 * line existed the only way to was to read six cards and do it by hand. Built
 * from the areas themselves, so it cannot drift from the cards below it.
 *
 * Returns `null` rather than a best effort in the two cases where the line
 * would argue with the figure above it: weights that do not make a whole, and
 * a sum that does not come to the score the server set. A line of arithmetic
 * that does not add up costs the report more than its absence does — and where
 * this is silent the cards are still the full account.
 *
 * Runs of parameters sharing a score and a weight collapse into one term: six
 * terms of which four are identical is not a formula a reader can hold. Only
 * ever neighbours, so the line still reads in the order the cards are laid out.
 */
function scoreWorking(areas: AreaView[], score: number | null): ScoreWorking | null {
  if (areas.length === 0 || score === null) return null;

  const weighted = areas.reduce((total, area) => total + area.weight, 0);
  if (Math.abs(weighted - 100) > 0.5) return null;

  const terms: WorkingTerm[] = [];
  for (const area of areas) {
    const last = terms.at(-1);
    if (last !== undefined && alike(last, area)) {
      last.count += 1;
    } else {
      terms.push({
        label: AREA_LABELS[area.area] ?? area.area,
        count: 1,
        score: area.score,
        weight: area.weight,
      });
    }
  }

  const contribution = (term: WorkingTerm) => (term.count * term.score * term.weight) / 100;
  const total = terms.reduce((running, term) => running + contribution(term), 0);
  if (Math.abs(total - score) > 0.5) return null;

  return {
    terms: terms
      .map((term) =>
        term.count === 1
          ? `${term.label} ${figure(term.score)} × ${figure(term.weight)}%`
          : `${String(term.count)} checks at ${figure(term.score)} × ${figure(term.weight)}% each`,
      )
      .join(' + '),
    contributions: terms.map((term) => figure(contribution(term))).join(' + '),
    total: figure(total),
  };
}

/** Whether a parameter belongs to the term already being built. */
function alike(term: WorkingTerm, area: AreaView): boolean {
  return term.score === area.score && term.weight === area.weight;
}

/** Two decimals at most, and none at all where the figure is whole. */
function figure(value: number): string {
  return Number(value.toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function Working({ working }: { working: ScoreWorking }) {
  return (
    <p className="mt-3 pl-1 text-xs leading-relaxed text-muted-foreground">
      How the score is worked out: {working.terms} = {working.contributions} ={' '}
      <span className="font-semibold text-foreground tabular-nums">{working.total}</span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  One parameter                                                              */
/* -------------------------------------------------------------------------- */

function ParameterTile({ area, index }: { area: AreaView; index: number }) {
  const headingId = `parameter-${area.area}`;
  const label = AREA_LABELS[area.area] ?? area.area;

  return (
    <li className="stagger" style={{ '--i': index } as React.CSSProperties}>
      <Card
        as="article"
        aria-labelledby={headingId}
        className="flex h-full flex-col overflow-hidden"
      >
        <div className="flex-1 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 id={headingId} className="text-sm font-semibold text-pretty text-foreground">
              {label}
            </h3>
            <StatusBadge status={area.status} />
          </div>

          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {METHOD_LABELS[area.method] ?? area.method}
          </p>

          <div className="mt-2.5 flex items-end justify-between gap-2">
            <p className="flex items-baseline gap-0.5">
              <span className="text-2xl leading-none font-semibold text-foreground tabular-nums">
                {area.score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </p>
            <span
              className="flex-none text-[11px] text-muted-foreground tabular-nums"
              title="How much of the compliance score this parameter can move"
            >
              {area.weight}% weight
            </span>
          </div>

          {/* The decisive figure's own sentence — no check id, no tally, just
              the one finding that drove the score. Where the engine wrote no
              reason, nothing is shown — the scoring method is already named
              above, and repeating it here as a finding is what made the old
              card read as though "Weakest check" were something the review
              had concluded. */}
          {area.reason ? (
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
              <Prose text={area.reason} />
            </p>
          ) : null}
        </div>
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

/** One glyph per status, so a row of badges reads at a glance before the words do. */
const STATUS_ICON: Record<CheckStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  partial: TriangleAlert,
  unable_to_validate: CircleDashed,
  missing_evidence: CircleSlash2,
  fail: XCircle,
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  const Icon = STATUS_ICON[status];

  return (
    <Badge tone={STATUS_TONE[status]} size="sm" className="shrink-0">
      <Icon aria-hidden="true" className="size-3" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
