/**
 * What the review is doing, told to the person waiting on it.
 *
 * The engine runs twenty-one numbered steps and streams an event for each.
 * Shown raw, that is a log: `step 6 · layout_fingerprint 9f2c1a ·
 * token_estimate 4180 · trimmed false`. Correct, and useless to the reviewer
 * who wants to know their file is being read and nothing is stuck.
 *
 * So the steps are rolled into seven named phases a person can hold in their
 * head and repeat to a colleague — "it's still reading the workbook" — and
 * every event becomes a sentence (see `lib/narrative.ts`). The step numbers
 * and raw payloads are not thrown away: one toggle puts them back, because
 * the engineer debugging a stuck review needs exactly what was there before.
 *
 * The screen is three things stacked, in the order a waiting reviewer asks
 * for them: what is happening *now*, how the checks are coming out, and the
 * step-by-step record underneath for anyone who wants it.
 *
 * Three things it refuses to do, all for the same reason — a reader who
 * mistakes an absent judgement for a passed one has been misled:
 *
 *  - A phase the pipeline skipped is badged "skipped", never left blank.
 *  - A shortcut is reported as a saving, with what it skipped.
 *  - A failed check gets a line of its own the moment it is known, rather
 *    than waiting for the report.
 */

import {
  AlertTriangle,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileSearch,
  FileText,
  Gavel,
  ListChecks,
  type LucideIcon,
  Minus,
  Settings2,
  Sparkles,
  UserRound,
  Workflow,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge, Card, ProgressBar } from '@/components/ui';
import { formatDuration, formatElapsed, parseTimestamp, useElapsed } from '@/hooks/useElapsed';
import { cn } from '@/utils/cn';

import {
  type ActivityLine,
  buildNarrative,
  type CheckTally,
  type LineKind,
  type Narrative,
  type PhaseId,
  type PhaseState,
  type PhaseView,
  STEP_LABELS,
} from '../lib/narrative';
import { formatUsd, type ProgressEvent } from '../types';

/**
 * One icon per phase, chosen for what does the work rather than for what the
 * work is about: a brain where an agent reasons, cogs where skills compute,
 * a gavel where a judgement is reached, the harness glyph where the system is
 * only sequencing. A reader scanning the rail should be able to see which
 * stretches of the review were decided and which were merely calculated.
 */
const PHASE_ICONS: Record<PhaseId, LucideIcon> = {
  intake: Workflow,
  read: FileSearch,
  identify: BrainCircuit,
  plan: ListChecks,
  checks: Settings2,
  judge: Gavel,
  report: FileText,
};

const LINE_ICONS: Partial<Record<LineKind, LucideIcon>> = {
  model: Sparkles,
  shortcut: Zap,
  attention: AlertTriangle,
};

export interface ReviewProgressProps {
  events: readonly ProgressEvent[];
  /**
   * The polled figure, as a floor.
   *
   * The stream's own figure wins where it is ahead: with the poll backed off
   * to a backstop rate while the stream is healthy, the polled percentage can
   * sit fifteen seconds behind the step being named right beside it.
   */
  progressPct: number;
  finished: boolean;
  connectionError: boolean;
  /** When the upload was accepted, for the elapsed clock. */
  startedAt: string;
  /**
   * The total the server has metered. Preferred once it is non-zero: the
   * stream's running total misses anything that happened before this browser
   * connected, which is every event on a reloaded page.
   */
  meteredUsd?: number | undefined;
  /**
   * How long the review actually took, as the server measured it.
   *
   * Used in place of the wall clock the moment the review ends. Counting from
   * `created_at` is right while it runs and absurd afterwards — a review from
   * this morning would report two hours of "elapsed".
   */
  durationMs?: number | undefined;
}

export function ReviewProgress({
  events,
  progressPct,
  finished,
  connectionError,
  startedAt,
  meteredUsd = 0,
  durationMs = 0,
}: ReviewProgressProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [overrides, setOverrides] = useState<Partial<Record<PhaseId, boolean>>>({});

  // Folded once per batch of events rather than once per render: this
  // component also re-renders on the elapsed-time tick every second, and that
  // tick must stay free.
  //
  // `finished` is passed in rather than inferred from the stream alone. A
  // connection that dropped before the terminal event would otherwise leave
  // the last phase it saw claiming to be running under a finished review.
  const narrative = useMemo(() => buildNarrative(events, { finished }), [events, finished]);

  const wallClockMs = useElapsed(startedAt, !finished);
  const elapsedMs = finished && durationMs > 0 ? durationMs : wallClockMs;
  const spent = Math.max(meteredUsd, narrative.spentUsd);
  const percent = finished ? 100 : Math.max(progressPct, narrative.progressPct ?? 0);

  return (
    <section aria-labelledby="progress-heading" className="space-y-4">
      <Headline
        narrative={narrative}
        progressPct={percent}
        finished={finished}
        elapsedMs={elapsedMs}
        spent={spent}
      />

      {connectionError ? <ConnectionNotice /> : null}

      <Timeline
        narrative={narrative}
        overrides={overrides}
        showTechnical={showTechnical}
        onToggleTechnical={() => {
          setShowTechnical((previous) => !previous);
        }}
        onTogglePhase={(phase) => {
          setOverrides((previous) => ({
            ...previous,
            [phase.id]: !(previous[phase.id] ?? phase.state === 'active'),
          }));
        }}
      />

      {/* The division of labour, said once at the bottom, because the actor
          named on each row above means nothing to a reader who has not been
          told what the three of them are allowed to do. */}
      <p className="max-w-prose px-1 text-xs leading-relaxed text-subtle-foreground">
        The <span className="font-medium text-muted-foreground">harness</span> sequences the work
        and never judges it. <span className="font-medium text-muted-foreground">Skills</span> read
        and calculate, in Python, exact to the cent. Only an{' '}
        <span className="font-medium text-muted-foreground">agent</span> judges, and a model is only
        ever asked to read, to judge, or to write, never to calculate.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  The headline card                                                          */
/* -------------------------------------------------------------------------- */

function Headline({
  narrative,
  progressPct,
  finished,
  elapsedMs,
  spent,
}: {
  narrative: Narrative;
  progressPct: number;
  finished: boolean;
  elapsedMs: number;
  spent: number;
}) {
  const failed = narrative.current?.kind === 'failed';
  const running = !finished && !failed;
  const { tally } = narrative;

  const activeIndex = narrative.phases.findIndex((phase) => phase.state === 'active');
  const activePhase = activeIndex === -1 ? null : narrative.phases[activeIndex];

  return (
    <Card
      tone={failed ? 'danger' : 'feature'}
      elevation="lift"
      className="hairline-top animate-rise overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        {/* --- Status line -------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2
            id="progress-heading"
            className={cn(
              'inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase',
              failed ? 'text-danger' : finished ? 'text-success' : 'text-primary',
            )}
          >
            {running ? (
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inset-0 animate-halo rounded-full bg-primary" />
                <span className="relative size-2 rounded-full bg-primary" />
              </span>
            ) : failed ? (
              <AlertTriangle aria-hidden="true" className="size-3.5" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
            )}
            {failed ? 'Review stopped' : finished ? 'Review complete' : 'Reviewing'}
          </h2>

          {activePhase ? (
            <span className="text-[11px] font-medium tracking-[0.08em] text-subtle-foreground uppercase tabular-nums">
              Phase {activeIndex + 1} of {narrative.phases.length}
            </span>
          ) : null}
        </div>

        {/*
          One line, swapped in place as the work moves on. A list that
          scrolled itself would make the reader chase it; this stays put and
          shimmers while there is something happening behind it.
        */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            'mt-2 max-w-prose text-lg leading-snug font-medium text-balance sm:text-xl',
            running ? 'text-shimmer' : 'text-foreground-strong',
          )}
        >
          {narrative.current?.text ?? idleText(finished, progressPct)}
        </p>

        {/* --- The three figures -------------------------------------------- */}
        <dl className="mt-5 grid grid-cols-3 divide-x divide-border-hairline overflow-hidden rounded-card border border-border-hairline bg-surface-muted/60">
          <Stat
            label={finished ? 'Took' : 'Elapsed'}
            value={formatElapsed(elapsedMs)}
            live={running}
          />
          <Stat
            label="Model spend"
            value={spent > 0 ? formatUsd(spent) : '$0.00'}
            hint={
              spent > 0
                ? `${String(narrative.modelCalls)} model call${narrative.modelCalls === 1 ? '' : 's'}`
                : 'nothing spent yet'
            }
          />
          <Stat label="Progress" value={`${String(Math.round(progressPct))}%`} />
        </dl>

        {/* --- Where it has got to ------------------------------------------ */}
        <div className="mt-4">
          <p className="mb-1.5 flex items-baseline gap-2 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">
              {activePhase
                ? `${activePhase.title} (${activePhase.actor})`
                : finished
                  ? 'All phases settled'
                  : 'Not started yet'}
            </span>
          </p>
          <ProgressBar
            value={progressPct}
            tone={failed ? 'danger' : finished ? 'success' : 'primary'}
            active={running}
            label="Review progress"
          />
        </div>
      </div>

      {tally.settled > 0 ? <Outcomes tally={tally} /> : null}
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  live = false,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  live?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5 sm:px-4">
      <dt className="text-[10px] font-semibold tracking-[0.1em] text-subtle-foreground uppercase">
        {label}
      </dt>
      <dd
        className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold text-foreground tabular-nums sm:text-xl"
        {...(hint ? { title: hint } : {})}
      >
        {live ? (
          <span aria-hidden className="size-1.5 shrink-0 animate-breathe rounded-full bg-primary" />
        ) : null}
        <span className="truncate">{value}</span>
      </dd>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">{hint}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  How the checks are coming out                                              */
/* -------------------------------------------------------------------------- */

/**
 * The settled checks as one bar rather than six pills.
 *
 * Six badges in a row read as six unrelated facts, and the one question the
 * reviewer actually has — *is this going well?* — takes a second pass to
 * answer. A stacked bar answers it at a glance and the legend still carries
 * every exact figure, so nothing is traded away for the picture.
 *
 * Two things are deliberately kept out of the bar:
 *
 *  - **Checks going to a person.** A check can pass *and* need a person. Its
 *    own segment would double-count it and make the widths a lie, so it sits
 *    beside the bar, labelled as cutting across the outcomes.
 *  - **Observations.** They run and are never scored. They are in the bar but
 *    hatched rather than filled, and the legend says they carry no weight.
 */
const OUTCOMES = [
  {
    key: 'pass',
    label: 'passed',
    bar: 'bg-success',
    dot: 'bg-success',
    title: 'Established against the workbook',
  },
  {
    key: 'partial',
    label: 'partial',
    bar: 'bg-warning',
    dot: 'bg-warning',
    title: 'Established in part only',
  },
  {
    key: 'unproven',
    label: 'unproven',
    bar: 'bg-muted-foreground/45',
    dot: 'bg-muted-foreground/60',
    title: 'Nothing was established either way, which is not a near-pass',
  },
  {
    key: 'fail',
    label: 'failed',
    bar: 'bg-danger',
    dot: 'bg-danger',
    title: 'An exception the reviewer will have to act on',
  },
  {
    key: 'observations',
    label: 'observations',
    bar: 'bg-info/35',
    dot: 'bg-info/50',
    title: 'Reported to the reviewer and never scored; these carry no weight',
  },
] as const satisfies readonly {
  key: keyof CheckTally;
  label: string;
  bar: string;
  dot: string;
  title: string;
}[];

function Outcomes({ tally }: { tally: CheckTally }) {
  const segments = OUTCOMES.map((outcome) => ({ ...outcome, count: tally[outcome.key] })).filter(
    (segment) => segment.count > 0,
  );

  // Anything settled under a status this client does not recognise. Shown as
  // its own grey remainder rather than folded into one of the five above — a
  // new backend status must never quietly land in the "passed" column.
  const counted = segments.reduce((total, segment) => total + segment.count, 0);
  const unrecognised = Math.max(0, tally.settled - counted);

  return (
    <div className="border-t border-border-hairline bg-surface-muted/40 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{tally.settled}</span> check
          {tally.settled === 1 ? '' : 's'} settled
        </p>

        {tally.needsPerson > 0 ? (
          <Badge
            tone="accent"
            size="sm"
            title="Counted across the outcomes beside it, not in addition to them"
          >
            <UserRound aria-hidden="true" />
            {tally.needsPerson} going to a person
          </Badge>
        ) : null}
      </div>

      <div
        aria-hidden
        className="mt-2.5 flex h-2 gap-px overflow-hidden rounded-pill bg-surface-sunken"
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            style={{ flexGrow: segment.count }}
            className={cn(
              'h-full min-w-[3px] first:rounded-l-pill last:rounded-r-pill',
              segment.bar,
            )}
          />
        ))}
        {unrecognised > 0 ? (
          <span
            style={{ flexGrow: unrecognised }}
            className="h-full min-w-[3px] rounded-r-pill bg-border-strong"
          />
        ) : null}
      </div>

      <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <li
            key={segment.key}
            title={segment.title}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span aria-hidden className={cn('size-2 rounded-full', segment.dot)} />
            <span className="font-semibold text-foreground tabular-nums">{segment.count}</span>
            {segment.label}
          </li>
        ))}
        {unrecognised > 0 ? (
          <li
            title="Settled under a status this page does not recognise, and left out of the breakdown rather than guessed at"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span aria-hidden className="size-2 rounded-full bg-border-strong" />
            <span className="font-semibold text-foreground tabular-nums">{unrecognised}</span>
            unclassified
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/**
 * What to say before a single event has arrived.
 *
 * Three different situations, and they must not share a sentence. A review
 * waiting for a slot has not started; one the server already reports progress
 * on has started but this browser connected too late to have seen it; and a
 * finished one is simply done.
 */
function idleText(finished: boolean, progressPct: number): string {
  if (finished) return 'Finished. The report is below.';
  if (progressPct > 0) return 'Already under way. Catching up with what it has done so far.';
  return 'Queued, waiting for a slot to run in.';
}

function ConnectionNotice() {
  return (
    <p
      role="status"
      className="flex items-start gap-2.5 rounded-card border border-warning/40 bg-warning/[0.08] px-4 py-3 text-sm leading-relaxed text-foreground"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <span>
        The live feed dropped, so the steps below may be behind. The review itself carries on
        untouched, and this page is still checking for the result.
      </span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  The step-by-step record                                                    */
/* -------------------------------------------------------------------------- */

function Timeline({
  narrative,
  overrides,
  showTechnical,
  onToggleTechnical,
  onTogglePhase,
}: {
  narrative: Narrative;
  overrides: Partial<Record<PhaseId, boolean>>;
  showTechnical: boolean;
  onToggleTechnical: () => void;
  onTogglePhase: (phase: PhaseView) => void;
}) {
  // Phases that actually ran. A skipped one is deliberately not counted as
  // completed: "7 of 7 completed" over a pipeline that skipped two of them
  // would be the one claim this panel exists to avoid making.
  const completed = narrative.phases.filter(
    (phase) => phase.state === 'done' || phase.state === 'unseen',
  ).length;

  return (
    <Card elevation="rest" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-hairline px-4 py-3 sm:px-5">
        <h3 className="flex items-baseline gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Step by step
          <span className="font-normal tracking-normal text-subtle-foreground normal-case">
            <span className="tabular-nums">
              {completed} of {narrative.phases.length}
            </span>{' '}
            phases completed via Harness, Agents and Skills
          </span>
        </h3>

        <button
          type="button"
          aria-pressed={showTechnical}
          onClick={onToggleTechnical}
          className={cn(
            'shrink-0 press rounded-pill border px-3 py-1 text-xs font-medium',
            showTechnical
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
          )}
        >
          {showTechnical ? 'Hide step detail' : 'Show step detail'}
        </button>
      </div>

      <ol className="px-2 py-2 sm:px-3 sm:py-3">
        {narrative.phases.map((phase, index) => (
          <Phase
            key={phase.id}
            phase={phase}
            index={index}
            isLast={index === narrative.phases.length - 1}
            open={overrides[phase.id] ?? phase.state === 'active'}
            showTechnical={showTechnical}
            onToggle={() => {
              onTogglePhase(phase);
            }}
          />
        ))}
      </ol>
    </Card>
  );
}

const RAIL_STYLE: Record<PhaseState, { ring: string; icon: string; title: string }> = {
  pending: {
    ring: 'border-border bg-surface-muted',
    icon: 'text-subtle-foreground',
    title: 'text-subtle-foreground',
  },
  active: {
    ring: 'border-primary/50 bg-primary/10',
    icon: 'text-primary',
    title: 'text-foreground-strong',
  },
  done: {
    ring: 'border-success/40 bg-success/10',
    icon: 'text-success',
    title: 'text-foreground',
  },
  skipped: {
    ring: 'border-dashed border-border-strong bg-transparent',
    icon: 'text-subtle-foreground',
    title: 'text-muted-foreground',
  },
  unseen: {
    ring: 'border-border bg-surface-muted',
    icon: 'text-muted-foreground',
    title: 'text-muted-foreground',
  },
};

function Phase({
  phase,
  index,
  isLast,
  open,
  showTechnical,
  onToggle,
}: {
  phase: PhaseView;
  index: number;
  isLast: boolean;
  open: boolean;
  showTechnical: boolean;
  onToggle: () => void;
}) {
  const style = RAIL_STYLE[phase.state];
  const panelId = `phase-${phase.id}-detail`;
  const Icon = PHASE_ICONS[phase.id];
  // An unseen phase has no lines but does have an explanation worth opening.
  const empty = phase.lines.length === 0 && phase.state !== 'unseen';
  const active = phase.state === 'active';

  return (
    <li className="relative stagger" style={{ '--i': index } as React.CSSProperties}>
      {/* The rail. A single absolutely-positioned line rather than a border on
          each row, so a skipped phase does not leave a gap in the thread. */}
      {isLast ? null : (
        <span
          aria-hidden
          className={cn(
            'absolute top-11 bottom-0 left-[1.625rem] w-px',
            phase.state === 'done' ? 'bg-success/30' : 'bg-border',
          )}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={empty}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-card p-2 text-left',
          'transition-colors duration-[160ms] ease-glide',
          active && 'bg-primary/[0.045]',
          empty ? 'cursor-default' : 'hover:bg-surface-muted',
        )}
      >
        <span
          className={cn(
            'relative flex size-9 shrink-0 items-center justify-center rounded-pill border',
            'transition-colors duration-[280ms] ease-glide',
            style.ring,
          )}
        >
          {active ? (
            <span
              aria-hidden
              className="absolute inset-0 animate-halo rounded-pill bg-primary/25"
            />
          ) : null}

          {phase.state === 'done' ? (
            <Check aria-hidden="true" className={cn('size-4 animate-pop', style.icon)} />
          ) : phase.state === 'skipped' ? (
            <Minus aria-hidden="true" className={cn('size-4', style.icon)} />
          ) : phase.state === 'unseen' ? (
            <Clock aria-hidden="true" className={cn('size-4', style.icon)} />
          ) : (
            <Icon aria-hidden="true" className={cn('relative size-[17px]', style.icon)} />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('text-sm font-semibold', style.title)}>
              {phase.title}{' '}
              <span className="font-medium text-muted-foreground">({phase.actor})</span>
            </span>

            {showTechnical ? (
              <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-subtle-foreground">
                {phase.steps.join(' · ')}
              </span>
            ) : null}

            {active ? (
              <Badge tone="primary" size="sm" live>
                running
              </Badge>
            ) : null}

            {phase.state === 'skipped' ? (
              <Badge
                tone="neutral"
                size="sm"
                variant="outline"
                title="Nothing here was assessed, so nothing here has passed"
              >
                skipped
              </Badge>
            ) : null}

            {phase.state === 'unseen' ? (
              <Badge
                tone="neutral"
                size="sm"
                variant="outline"
                title="This work was done before the page connected to the live feed"
              >
                done earlier
              </Badge>
            ) : null}
          </span>

          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {phase.state === 'skipped'
              ? 'Not needed on this review. Nothing here was assessed.'
              : phase.state === 'unseen'
                ? 'Finished before this page joined the live feed.'
                : // While it runs, the newest line is the more useful of the
                  // two; once it is over, what the phase *is* reads better
                  // than whatever its last event happened to say.
                  active
                  ? (phase.lines.at(-1)?.text ?? phase.blurb)
                  : phase.blurb}
          </span>
        </span>

        {/* The figures, in their own right-hand column so they line up down
            the list instead of sitting at a different place on every row. */}
        <span className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
          {/* Below a tenth of a second there is nothing to report, and "0.0s"
              next to a phase reads as a stalled timer. */}
          {phase.durationMs >= 100 ? (
            <span className="text-xs font-medium text-foreground tabular-nums">
              {formatDuration(phase.durationMs)}
            </span>
          ) : null}
          {phase.costUsd > 0 ? (
            <span className="text-[11px] text-subtle-foreground tabular-nums">
              {formatUsd(phase.costUsd)}
            </span>
          ) : phase.lines.length > 0 ? (
            <span className="text-[11px] text-subtle-foreground tabular-nums">
              {phase.lines.length} update{phase.lines.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </span>

        {empty ? (
          <span aria-hidden className="size-4 shrink-0" />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-subtle-foreground transition-transform duration-[280ms] ease-glide',
              open && 'rotate-180',
            )}
          />
        )}
      </button>

      {/*
        A `0fr`-to-`1fr` grid row rather than a max-height guess: the panel
        animates to exactly its own content height, so a phase with eleven
        lines and one with two both open at the same speed and neither clips.
      */}
      <div
        id={panelId}
        className={cn(
          'grid transition-[grid-template-rows] duration-[280ms] ease-out-soft',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 mb-3 ml-14 border-l border-border-hairline pr-2 pl-4">
            <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
              {phase.blurb}
            </p>

            {phase.note ? (
              <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-subtle-foreground">
                {phase.note}
              </p>
            ) : null}

            {phase.state === 'unseen' ? (
              <p className="mt-2 max-w-prose text-xs leading-relaxed text-subtle-foreground">
                This ran before the page connected, so there is no step-by-step record of it here.
                It was done, and what it found is in the report below.
              </p>
            ) : null}

            {phase.lines.length > 0 ? (
              <ul className="mt-2.5 space-y-2">
                {phase.lines.map((line, lineIndex) => (
                  <Line
                    key={line.id}
                    line={line}
                    index={lineIndex}
                    live={phase.state === 'active'}
                    showTechnical={showTechnical}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

function Line({
  line,
  index,
  live,
  showTechnical,
}: {
  line: ActivityLine;
  index: number;
  live: boolean;
  showTechnical: boolean;
}) {
  const Icon = LINE_ICONS[line.kind];
  // Only a step that is still running inside the phase that is still running
  // may pulse. A pending line left behind by a finished phase is history.
  const running = line.pending === true && live;

  return (
    <li
      className="flex stagger items-start gap-2.5 text-sm"
      style={{ '--i': index } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="mt-[0.3125rem] flex size-3.5 shrink-0 items-center justify-center"
      >
        {Icon ? (
          <Icon
            className={cn(
              'size-3.5',
              line.kind === 'model' && 'text-accent-strong',
              line.kind === 'shortcut' && 'text-info',
              line.kind === 'attention' && 'text-danger',
            )}
          />
        ) : (
          <span
            className={cn(
              'size-1.5 rounded-full',
              running ? 'animate-breathe bg-primary' : 'bg-border-strong',
            )}
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'leading-relaxed',
              line.kind === 'model' || line.kind === 'shortcut'
                ? 'text-muted-foreground'
                : 'text-foreground',
            )}
          >
            {line.text}
          </span>

          {showTechnical ? (
            <span className="mt-0.5 shrink-0 font-mono text-[10px] text-subtle-foreground tabular-nums">
              {clockTime(line.ts)}
            </span>
          ) : null}
        </span>

        {showTechnical ? <TechnicalDetail line={line} /> : null}
      </span>
    </li>
  );
}

/** `14:22:07` local, or nothing at all where the stamp cannot be read. */
function clockTime(ts: string): string {
  const ms = parseTimestamp(ts);
  if (ms === null) return '';
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * The raw event, for whoever is debugging rather than reviewing.
 *
 * Kept behind a toggle rather than deleted. The step number and the payload
 * are how an engineer and a reviewer end up talking about the same thing, and
 * removing them to make the panel pretty would cost more than it bought.
 */
function TechnicalDetail({ line }: { line: ActivityLine }) {
  const pairs = Object.entries(line.detail);

  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-subtle-foreground">
      <span className="rounded bg-surface-muted px-1.5 py-0.5 text-foreground/70">
        {line.step}
        {STEP_LABELS[line.step] ? ` · ${STEP_LABELS[line.step]}` : ''}
      </span>
      {pairs.map(([key, value]) => (
        <span key={key}>
          {key.replaceAll('_', ' ')} {String(value)}
        </span>
      ))}
    </span>
  );
}
