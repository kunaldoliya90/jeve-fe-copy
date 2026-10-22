/**
 * The progress stream, in the words of the person reading it.
 *
 * The engine thinks in numbered steps and emits details like
 * `layout_fingerprint 9f2c1a · token_estimate 4180 · trimmed false`. That is
 * exactly right for a log and exactly wrong for the reviewer waiting on the
 * result, who wants to know that their file is being read, that it was
 * recognised, and that nothing is stuck.
 *
 * So this module is the one place where a `(event, step, detail)` triple
 * becomes a sentence. It is deliberately pure — no React, no DOM — because
 * the wording *is* the product here, and wording that can be unit-tested is
 * wording that cannot quietly rot into jargon again.
 *
 * Two rules it holds to, both borrowed from the report itself:
 *
 *  - Nothing absent is ever described as passed. A skipped step says it was
 *    skipped and why; a format with no formulas says what that costs.
 *  - A shortcut is told as a saving, not hidden. A cache hit is the system
 *    working, and a reviewer who sees a review finish in two seconds deserves
 *    to know it reused an earlier one rather than guessing it cheated.
 */

import {
  AREA_LABELS,
  type CheckStatus,
  formatUsd,
  type ProgressEvent,
  STATUS_LABELS,
} from '../types';

/* -------------------------------------------------------------------------- */
/*  Phases                                                                     */
/* -------------------------------------------------------------------------- */

export type PhaseId = 'intake' | 'read' | 'identify' | 'plan' | 'checks' | 'judge' | 'report';

/**
 * Which part of the system does the work in a phase.
 *
 * Named on every row on purpose. "Reading the workbook" says what happened;
 * it does not say whether a deterministic skill did it, an agent decided it,
 * or the harness merely sequenced it — and those are three different things
 * to a reader asking how much of this result was reasoned about and how much
 * was computed. The harness orchestrates and never judges; a skill computes
 * and never judges; only an agent judges, and only an agent costs anything.
 */
export type PhaseActor = 'Harness' | 'Agent' | 'Skill' | 'Skills';

export interface PhaseSpec {
  id: PhaseId;
  /** What this stretch of work is, said once, in the business's words. */
  title: string;
  /** Who does it — shown beside the title, so no row is anonymous. */
  actor: PhaseActor;
  /** One sentence of "what is actually happening here", for the curious. */
  blurb: string;
  /**
   * The part that will not fit on a collapsed row.
   *
   * Everything here is a claim about what the phase does or refuses to do,
   * and none of it is decoration — it is the detail that stops a one-line
   * summary being read as the whole story.
   */
  note?: string;
  /** The engine's step numbers that roll up into this phase. */
  steps: readonly string[];
}

/**
 * Seven phases over twenty-one steps.
 *
 * The grouping is not cosmetic. Twenty-one rows is a log; seven named stages
 * is something a reviewer can hold in their head and describe to a colleague
 * — "it's still reading the workbook" — which is the whole purpose of showing
 * progress at all.
 */
export const PHASES: readonly PhaseSpec[] = [
  {
    id: 'intake',
    title: 'Trigger & Ingest File',
    actor: 'Harness',
    blurb:
      'The harness triggers the workflow and the ingestion step picks up the file and makes it available for processing.',
    note: 'The upload is confirmed to be a real Excel workbook by reading its content rather than trusting its name, and checked against files already reviewed under the same rules.',
    steps: ['2', '3'],
  },
  {
    id: 'read',
    title: 'Understand File & Structure',
    actor: 'Skill',
    blurb:
      'The structure-understanding skill reads the file, works out its layout and extracts the key information.',
    note: 'Every cell and every formula, then a measurement of how the tabs are laid out and where the tables sit. No model is involved: this is read and computed, not inferred.',
    steps: ['4', '5', '6'],
  },
  {
    id: 'identify',
    title: 'Classify Entry & Determine Checks',
    actor: 'Agent',
    blurb:
      'The classification agent draws on several skills to work out what this entry is, and settles which set of checks applies to it.',
    note: "The workbook's own column headings are matched against the catalogue of entry types, then it is read a second time from scratch to see whether the two readings agree. A disagreement sends the review to a person; it never moves a figure.",
    steps: ['7a', '7', '8', '9', '10'],
  },
  {
    id: 'plan',
    title: 'Plan & Initiate Checks',
    actor: 'Harness',
    blurb:
      'The harness draws up the checks this entry type calls for and sets the validation work running.',
    note: 'Any check this particular workbook cannot support is set aside and reported as not run, never quietly passed.',
    steps: ['11', '12'],
  },
  {
    id: 'checks',
    title: 'Execute Checks',
    actor: 'Skills',
    blurb:
      'Skills run side by side (amount validation, period and cut-off, trend, PII) and their results are gathered up for the agent.',
    note: 'The arithmetic is re-performed in Python, cell by cell. The evidence that is not a number (the written methodology, any pasted screenshots) is read alongside it.',
    steps: ['13a', '13', '13b'],
  },
  {
    id: 'judge',
    title: 'Evaluate & Form Judgement',
    actor: 'Agent',
    blurb:
      'The review agent weighs the check results, applies the defined rules and decides each outcome: pass, partial or exception.',
    note: 'It argues against its own conclusions before anything is scored, and a second opinion may only make a result stricter, never kinder. The scores themselves are arithmetic, not judgement.',
    steps: ['14', '15', '16', '17'],
  },
  {
    id: 'report',
    title: 'Generate Output & Update Record',
    actor: 'Harness',
    blurb:
      'The harness compiles the results, writes the summary, stores the output and updates the record.',
    note: 'The report is written over scores that are already fixed, and every number in the prose is traced back to a figure or to the score. Anything that traces to neither is listed as untraced rather than removed.',
    steps: ['18', '19', '20'],
  },
];

const PHASE_OF_STEP = new Map<string, number>(
  PHASES.flatMap((phase, index) => phase.steps.map((step) => [step, index] as const)),
);

/* -------------------------------------------------------------------------- */
/*  Wording                                                                    */
/* -------------------------------------------------------------------------- */

/** What a step is doing, while it is doing it. Present tense, no jargon. */
const STEP_ACTIVITY: Record<string, string> = {
  '2': 'Checking the upload is a real Excel workbook',
  '3': 'Looking for an identical file already reviewed',
  '4': 'Reading every cell and formula',
  '5': 'Measuring how the workbook is laid out',
  '6': 'Summarising the layout',
  '7a': 'Matching the column headings against the catalogue',
  '7': 'Checking whether this layout has been proved out before',
  '8': 'Reading the workbook a second time, independently',
  '9': 'Testing that second reading against the workbook itself',
  '10': 'Settling which set of checks applies',
  '11': 'Choosing which checks to run',
  '12': 'Setting aside any check this workbook cannot support',
  '13a': 'Reading the evidence that is not a number',
  '13': 'Re-performing the arithmetic, check by check',
  '13b': 'Grouping the exceptions by cause',
  '14': 'Working out what the figures mean',
  '15': 'Arguing against its own conclusions',
  '16': 'Applying the rules to each result',
  '17': 'Scoring',
  '18': 'Writing the report',
  '19': 'Tracing every number in the report',
  '20': 'Filing the record',
};

/**
 * A short label for the step, for the technical view and for tooltips.
 *
 * Kept separate from the activity line above because one is a name and the
 * other is a sentence, and a UI needs both: "Step 13 — Running the checks" in
 * a chip, "Re-performing the arithmetic, check by check" on the live line.
 */
export const STEP_LABELS: Record<string, string> = {
  '2': 'Gatekeeper',
  '3': 'Reuse check',
  '4': 'Reading the workbook',
  '5': 'Profiling the structure',
  '6': 'Structure context',
  '7a': 'Recognising the layout',
  '7': 'Known layout',
  '8': 'Independent reading',
  '9': 'Verifying the reading',
  '10': 'Choosing the entry type',
  '11': 'Planning the checks',
  '12': 'Checking the plan',
  '13a': 'Non-numeric evidence',
  '13': 'Running the checks',
  '13b': 'Grouping exceptions',
  '14': 'Judging',
  '15': 'Challenging',
  '16': 'Applying the rules',
  '17': 'Scoring',
  '18': 'Writing the report',
  '19': 'Tracing the numbers',
  '20': 'Storing the record',
};

/**
 * What each model call was asked to do, phrased as the end of the sentence
 * "Asked the model to …".
 *
 * These are the only places a model is involved at all, which is worth saying
 * plainly: a reviewer who assumes the score came out of a chatbot reads the
 * whole report differently from one who knows the arithmetic was Python and
 * the model only wrote the prose.
 */
const AI_PURPOSE: Record<string, string> = {
  'AI-1': 'read the workbook from scratch, without being told what it is',
  'AI-2': 'propose checks for the few questions that have no fixed recipe',
  'AI-M': 'read the written methodology tab',
  'AI-R': 'read the screenshots pasted into the workbook',
  'AI-X': 'group the exceptions by their likely cause',
  'AI-3': 'judge what the figures mean',
  'AI-4': 'argue against its own conclusions',
  'AI-5': 'write the report',
};

/* -------------------------------------------------------------------------- */
/*  Detail readers                                                             */
/* -------------------------------------------------------------------------- */

type Detail = ProgressEvent['detail'];

function readNumber(detail: Detail, key: string): number | null {
  const raw = detail[key];
  if (raw === null || raw === undefined || typeof raw === 'boolean') return null;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readText(detail: Detail, key: string): string | null {
  const raw = detail[key];
  if (raw === null || raw === undefined || raw === '') return null;
  return String(raw);
}

function readFlag(detail: Detail, key: string): boolean | null {
  const raw = detail[key];
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

function count(value: number): string {
  return value.toLocaleString('en-US');
}

function plural(value: number, one: string, many = `${one}s`): string {
  return `${count(value)} ${value === 1 ? one : many}`;
}

/** `25.4 MB`, `812 KB`. Decimal units, because that is what a file dialog shows. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1_000_000)
    return `${Math.max(1, Math.round(bytes / 1000)).toLocaleString('en-US')} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function percent(fraction: number): string {
  return `${String(Math.round(fraction * 100))}%`;
}

/**
 * A list the reader can scan, cut off before it becomes a wall.
 *
 * Split on a semicolon or on a comma *followed by a space*, which is how the
 * server joins these fields — never on a bare comma. One of these fields
 * carries figures, and `4,200` is one number, not two.
 */
function listOf(raw: string, limit = 3): string {
  const parts = raw
    .split(/;\s*|,\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== '' && part !== 'none');
  if (parts.length === 0) return '';
  const shown = parts.slice(0, limit).join(', ');
  return parts.length > limit ? `${shown}, and ${String(parts.length - limit)} more` : shown;
}

/* -------------------------------------------------------------------------- */
/*  One line of the story                                                      */
/* -------------------------------------------------------------------------- */

export type LineKind =
  /** A step of the pipeline, running or just finished. */
  | 'progress'
  /** Work handed to a model, with what it cost. */
  | 'model'
  /** Something skipped because it was already known. Always told as a saving. */
  | 'shortcut'
  /** A result worth reading before the report exists. */
  | 'finding'
  /** Something a person will have to look at. */
  | 'attention'
  /** The review ended. */
  | 'done'
  /** The review stopped without a result. */
  | 'failed';

export interface ActivityLine {
  id: string;
  kind: LineKind;
  /** The sentence shown to the reader. */
  text: string;
  /** The engine's step, kept so the technical view can show it. */
  step: string;
  /** The raw payload, kept for the same reason. Never rendered by default. */
  detail: Detail;
  ts: string;
  /** Set on a model call, so a step can show what it spent. */
  costUsd?: number;
  /** True while a step is running and has not reported its outcome. */
  pending?: boolean;
  /** How many events this line stands for, where identical ones are merged. */
  count?: number;
}

/**
 * The sentence for one event, or `null` where the event is better told in
 * aggregate — `check_finished` is eighteen events that should read as one
 * tally, not eighteen lines nobody scrolls through.
 */
export function describeEvent(event: ProgressEvent): Omit<ActivityLine, 'id'> | null {
  const { detail, step } = event;
  const base = { step, detail, ts: event.ts };

  switch (event.event) {
    case 'review_started': {
      const name = readText(detail, 'file_name') ?? 'the workbook';
      const size = readNumber(detail, 'size_bytes');
      return {
        ...base,
        kind: 'progress',
        text: size === null ? `Opened ${name}.` : `Opened ${name}, ${formatBytes(size)}.`,
      };
    }

    case 'cache_hit':
      return { ...base, kind: 'shortcut', text: shortcutText(detail, step) };

    case 'ai_call': {
      const call = readText(detail, 'call') ?? event.name;
      const purpose = AI_PURPOSE[call] ?? 'help with this step';
      const cost = readNumber(detail, 'cost_usd') ?? 0;
      const latency = readNumber(detail, 'latency_ms');
      const parts = [formatUsd(cost)];
      if (latency !== null && latency > 0) parts.push(`${(latency / 1000).toFixed(1)}s`);
      return {
        ...base,
        kind: 'model',
        text: `Asked the model to ${purpose} (${parts.join(', ')}).`,
        costUsd: cost,
      };
    }

    case 'step_started':
      return {
        ...base,
        kind: 'progress',
        pending: true,
        text: STEP_ACTIVITY[step] ?? (event.name || `Working on step ${step}`),
      };

    case 'step_finished': {
      const text = finishedText(step, detail);
      return text === null
        ? null
        : { ...base, kind: step === '19' || step === '10' ? 'attention' : 'progress', text };
    }

    case 'review_completed':
      return { ...base, kind: 'done', text: completedText(event) };

    case 'review_failed':
      return {
        ...base,
        kind: 'failed',
        text: readText(detail, 'message') ?? 'The review stopped before it reached a result.',
      };

    // Rolled into the tally instead. See `buildNarrative`.
    case 'check_finished':
      return null;
  }
}

function shortcutText(detail: Detail, step: string): string {
  const kind = readText(detail, 'kind');
  if (kind === 'reuse' || step === '3') {
    return 'This exact file has been reviewed before under these same rules. Reusing that result rather than paying to produce it again. The findings below are that review, under this upload.';
  }
  if (kind === 'layout' || step === '7') {
    return 'This workbook uses a layout that has already been read and proved out, so the second independent read and the planning that goes with it can be skipped. Every check still runs on this file.';
  }
  return 'Reused work already done, so this part costs nothing.';
}

/**
 * What a step came to.
 *
 * `null` where a step's payload says nothing a reader can use; the running
 * line then simply stays, which is honest — the step happened, and there is
 * nothing to report about it.
 */
function finishedText(step: string, detail: Detail): string | null {
  switch (step) {
    case '4': {
      const sheets = readNumber(detail, 'sheets');
      const cells = readNumber(detail, 'cells');
      const formulas = readFlag(detail, 'formulas_available');
      const read =
        sheets === null
          ? 'Read the workbook'
          : `Read ${plural(sheets, 'tab')}${cells === null ? '' : ` and ${plural(cells, 'cell')}`}`;
      if (formulas === false) {
        return `${read}. This file format stores only the values, not the formulas behind them, so anything that needs a formula to prove is reported as unproven rather than passed.`;
      }
      // Only claimed when the server actually said so. An absent flag is not
      // evidence that the formulas were there.
      return formulas === true ? `${read}, formulas included.` : `${read}.`;
    }

    case '5': {
      const tables = readNumber(detail, 'tables');
      const defects = readNumber(detail, 'defects');
      const found = tables === null ? 'Measured the layout' : `Found ${plural(tables, 'table')}`;
      if (defects !== null && defects > 0) {
        return `${found}, and ${plural(defects, 'thing')} worth noting: a number typed over a formula, a broken reference, that sort of thing. These are reported, never scored.`;
      }
      return `${found}. Nothing out of the ordinary in the formulas.`;
    }

    case '6': {
      const trimmed = readFlag(detail, 'trimmed');
      const base =
        "Took the layout's fingerprint, so the next workbook from the same template is recognised straight away.";
      return trimmed === true ? `${base} The summary was trimmed to fit.` : base;
    }

    case '7a': {
      const type = readText(detail, 'je_type');
      if (type === null || type === 'unknown') {
        return 'Nothing in the catalogue matches these column headings, so no entry type’s checks can be applied on shape alone.';
      }
      const variant = readText(detail, 'variant');
      const confidence = readNumber(detail, 'confidence');
      const bound = readNumber(detail, 'tables_bound');
      const unbound = readText(detail, 'unbound');
      const sure = confidence === null ? '' : `, ${percent(confidence)} sure`;
      const matched = bound === null ? '' : ` ${plural(bound, 'table')} matched up.`;
      const missed =
        unbound !== null && unbound !== 'none' ? ` Could not place: ${listOf(unbound)}.` : '';
      return `Recognised as ${type}${variant === null ? '' : ` (${variant})`} from the workbook’s own headings${sure}.${matched}${missed}`;
    }

    case '9': {
      const agrees = readFlag(detail, 'agrees');
      const confidence = readNumber(detail, 'confidence');
      const citations = readNumber(detail, 'citations_verified');
      if (agrees === false) {
        return 'The two readings disagreed about what this entry is, so a person will look at it. None of the arithmetic depends on this; the figures stand either way.';
      }
      const sure = confidence === null ? '' : ` (${percent(confidence)} sure)`;
      const backed =
        citations === null || citations === 0
          ? ''
          : `, backed by ${plural(citations, 'cell reference')} checked against the file`;
      return `Both readings agree on what this entry is${sure}${backed}.`;
    }

    case '10': {
      const type = readText(detail, 'je_type');
      return `The workbook’s shape matched nothing in the catalogue, so the checks for the type named on the upload form are being run instead${type === null ? '' : ` (${type})`}. Nothing below counts as confirmed, whatever it scores.`;
    }

    case '11': {
      const steps = readNumber(detail, 'steps');
      const fromCache = readFlag(detail, 'from_cache');
      const proposed = readNumber(detail, 'proposed_by_model') ?? 0;
      if (steps === null) return null;
      if (fromCache === true) {
        return `${plural(steps, 'check')} drawn up from a plan already proved out for this layout.`;
      }
      return proposed > 0
        ? `${plural(steps, 'check')} drawn up, ${count(proposed)} of which the model had to propose because no fixed recipe covers them.`
        : `${plural(steps, 'check')} drawn up entirely from fixed recipes, with no model involved in deciding what to test.`;
    }

    case '12': {
      const steps = readNumber(detail, 'steps');
      const dropped = readText(detail, 'dropped');
      const planned = steps === null ? 'The plan holds' : `${plural(steps, 'check')} will run`;
      if (dropped !== null && dropped !== 'none') {
        return `${planned}. Set aside because this workbook does not carry what they need: ${listOf(dropped)}. These are reported as not run, not as passed.`;
      }
      return `${planned}, and every one of them is supported by this workbook.`;
    }

    case '13': {
      const checks = readNumber(detail, 'checks');
      const figures = readNumber(detail, 'figures');
      if (checks === null) return null;
      return `Ran ${plural(checks, 'check')}${figures === null ? '' : `, producing ${plural(figures, 'figure')} from the workbook itself`}.`;
    }

    case '13b': {
      const causes = readNumber(detail, 'causes');
      const checks = readNumber(detail, 'checks');
      if (causes === null) return null;
      return `Too many exceptions to read as a list, so they were grouped into ${plural(causes, 'cause')}${checks === null ? '' : ` across ${plural(checks, 'check')}`}.`;
    }

    case '14': {
      const judged = readNumber(detail, 'judged');
      return judged === null ? null : `Reached a conclusion on ${plural(judged, 'check')}.`;
    }

    case '15': {
      const challenged = readNumber(detail, 'challenged');
      const stricter = readNumber(detail, 'made_stricter') ?? 0;
      if (challenged === null) return null;
      return stricter > 0
        ? `Re-read ${plural(challenged, 'conclusion')} and made ${count(stricter)} of them stricter. A challenge can only ever tighten a result, never loosen one.`
        : `Re-read ${plural(challenged, 'conclusion')}; none of them needed tightening.`;
    }

    case '17': {
      const score = readNumber(detail, 'score');
      const band = readText(detail, 'band');
      if (score === null) return null;
      return `Scored ${String(score)} out of 100${band === null ? '' : `, ${band}`}.`;
    }

    case '19': {
      const untraced = readText(detail, 'untraced');
      if (untraced === null) return null;
      return `Some numbers in the write-up trace to no figure and no score: ${listOf(untraced, 6)}. They are named rather than deleted: a sentence with the figure quietly removed would read as though it had been verified.`;
    }

    default:
      return null;
  }
}

function completedText(event: ProgressEvent): string {
  if (event.name === 'Reused') {
    return 'Done. This result came from an identical file reviewed earlier, so nothing was re-read and nothing was spent.';
  }

  const score = readNumber(event.detail, 'score');
  const band = readText(event.detail, 'band');
  const provisional = readFlag(event.detail, 'provisional');

  if (score === null) return 'Done.';

  const caveat =
    provisional === true
      ? ' Provisional, because at least one check is still waiting on a person.'
      : '';
  return `Done. Scored ${String(score)} out of 100${band === null ? '' : `, ${band}`}.${caveat}`;
}

/* -------------------------------------------------------------------------- */
/*  The whole story                                                            */
/* -------------------------------------------------------------------------- */

export type PhaseState =
  /** Not reached yet. */
  | 'pending'
  /** Being worked on now. */
  | 'active'
  /** Ran, and this page saw it. */
  | 'done'
  /** The pipeline did not need it. Nothing here was assessed. */
  | 'skipped'
  /**
   * Ran before this page connected to the stream.
   *
   * Distinct from `skipped`, and the distinction matters more than it looks.
   * A browser that opens a review already in flight joins the stream part-way
   * and never sees the earlier events. Reporting those phases as "skipped"
   * would state, falsely, that the work was not done — the exact confusion
   * between "absent" and "not needed" the report is built to prevent.
   */
  | 'unseen';

export interface PhaseView extends PhaseSpec {
  state: PhaseState;
  lines: ActivityLine[];
  /** Wall clock across this phase's events, once it has more than one. */
  durationMs: number;
  /** What this phase spent on models. */
  costUsd: number;
}

export interface CheckTally {
  settled: number;
  pass: number;
  fail: number;
  partial: number;
  unproven: number;
  needsPerson: number;
  /**
   * Checks that run and are deliberately never scored.
   *
   * Counted apart from everything else. PII and trend are expected to be
   * present on a calculation tab, so folding a failed observation into the
   * fail count would report an exception that the score itself does not
   * recognise — and a reader comparing "4 failed" against a report showing two
   * failures would be right to distrust both numbers.
   */
  observations: number;
}

export interface Narrative {
  phases: PhaseView[];
  /** The newest line, for the one-line "what is happening now" headline. */
  current: ActivityLine | null;
  /** Checks whose outcome has arrived, as a tally rather than a list. */
  tally: CheckTally;
  /** Checks that came out badly, named — the only ones worth a line each. */
  notable: ActivityLine[];
  modelCalls: number;
  spentUsd: number;
  /**
   * The furthest progress any event has reported, or `null` where the server
   * does not carry it. Never decreases: an event arriving out of order must
   * not drag the bar backwards.
   */
  progressPct: number | null;
  /** True once a terminal event has arrived. */
  finished: boolean;
}

interface StepBucket {
  phase: number;
  order: number;
  /** The step's own progress line, replaced by its outcome when that lands. */
  progress: ActivityLine | null;
  /** Model calls, shortcuts and findings attached to the step. */
  extras: ActivityLine[];
  firstTs: number;
  lastTs: number;
  costUsd: number;
}

const EMPTY_TALLY: CheckTally = {
  settled: 0,
  pass: 0,
  fail: 0,
  partial: 0,
  unproven: 0,
  needsPerson: 0,
  observations: 0,
};

/** The area key the context file uses for checks that carry no weight. */
const OBSERVATION_AREA = 'observation';

/**
 * Fold the event stream into seven phases.
 *
 * Built fresh from the whole array rather than accumulated across renders on
 * purpose: the events are the single source of truth, so a reconnect that
 * replays or a poll that arrives first can never leave the panel showing a
 * state the stream does not support. The array is in the hundreds at most and
 * the fold is linear, so the cost of being stateless here is nil — and the
 * caller memoises on `events.length` regardless.
 */
export interface NarrativeOptions {
  /**
   * True when the *review* has ended, which the stream may not have said.
   *
   * The terminal event is one source of that fact and the polled status is the
   * other, and they can disagree: a stream dropped at step 17 never delivers
   * its terminal event, and without this the last phase it reached would go on
   * claiming to be running under a finished review.
   */
  finished?: boolean | undefined;
}

export function buildNarrative(
  events: readonly ProgressEvent[],
  options: NarrativeOptions = {},
): Narrative {
  const buckets = new Map<string, StepBucket>();
  const notable: ActivityLine[] = [];
  const tally: CheckTally = { ...EMPTY_TALLY };

  let terminal: ActivityLine | null = null;
  let latestPhase = 0;
  let modelCalls = 0;
  let spentUsd = 0;
  let order = 0;
  let progressPct: number | null = null;
  let firstPhase: number | null = null;

  // A `for` loop rather than `forEach`: the terminal line is assigned from
  // inside it, and TypeScript cannot see an assignment made in a callback.
  for (const [index, event] of events.entries()) {
    const reportedPct = event.progress_pct;
    if (typeof reportedPct === 'number' && Number.isFinite(reportedPct)) {
      progressPct = Math.max(progressPct ?? 0, Math.min(Math.max(reportedPct, 0), 100));
    }

    if (event.event === 'check_finished') {
      recordCheck(event, tally, notable);
      continue;
    }

    const described = describeEvent(event);
    if (!described) continue;

    const line: ActivityLine = {
      ...described,
      id: `${event.event}-${event.step}-${String(index)}`,
    };

    if (line.kind === 'done' || line.kind === 'failed') {
      terminal = line;
      continue;
    }

    const step = event.step || '-';
    const phase = PHASE_OF_STEP.get(step) ?? latestPhase;
    latestPhase = Math.max(latestPhase, phase);
    firstPhase = firstPhase === null ? phase : Math.min(firstPhase, phase);

    const bucket = buckets.get(step) ?? {
      phase,
      order: order++,
      progress: null,
      extras: [],
      firstTs: timeOf(line.ts),
      lastTs: timeOf(line.ts),
      costUsd: 0,
    };
    bucket.lastTs = timeOf(line.ts);

    if (line.kind === 'progress' || line.kind === 'attention') {
      // A started line is a promise; a finished line is the outcome. Showing
      // both would double the length of the panel to say the same thing
      // twice, so the outcome replaces the promise — and never the reverse,
      // which is what a replayed stream after a reconnect would otherwise do.
      const isOutcome = line.pending !== true;
      if (isOutcome || bucket.progress === null) bucket.progress = line;
    } else {
      bucket.extras.push(line);
    }

    if (line.kind === 'model') {
      modelCalls += 1;
      const cost = line.costUsd ?? 0;
      spentUsd += cost;
      bucket.costUsd += cost;
    }

    buckets.set(step, bucket);
  }

  const ended = terminal !== null || options.finished === true;

  const phases: PhaseView[] = PHASES.map((spec, index) => {
    const own = [...buckets.values()]
      .filter((bucket) => bucket.phase === index)
      .sort((left, right) => left.order - right.order);

    const lines = own.flatMap((bucket) => [
      ...(bucket.progress ? [bucket.progress] : []),
      ...bucket.extras,
    ]);

    // The judge phase owns the check tally, so its notable outcomes belong
    // there rather than floating at the bottom of the panel.
    if (spec.id === 'judge') lines.push(...notable);

    const first = Math.min(...own.map((bucket) => bucket.firstTs));
    const last = Math.max(...own.map((bucket) => bucket.lastTs));

    return {
      ...spec,
      state: stateOf({
        hasLines: lines.length > 0,
        index,
        firstPhase,
        latestPhase,
        finished: ended,
      }),
      lines,
      durationMs: own.length > 0 && Number.isFinite(first) ? Math.max(0, last - first) : 0,
      costUsd: own.reduce((total, bucket) => total + bucket.costUsd, 0),
    };
  });

  const lastPhaseLine = [...phases].reverse().find((phase) => phase.lines.length > 0);

  return {
    phases,
    current: terminal ?? lastPhaseLine?.lines.at(-1) ?? null,
    tally,
    notable,
    modelCalls,
    spentUsd,
    progressPct,
    finished: ended,
  };
}

function stateOf(input: {
  hasLines: boolean;
  index: number;
  /** The earliest phase any observed event belonged to, or null for none. */
  firstPhase: number | null;
  latestPhase: number;
  finished: boolean;
}): PhaseState {
  const { hasLines, index, firstPhase, latestPhase, finished } = input;

  if (hasLines) return finished || index < latestPhase ? 'done' : 'active';

  // Nothing observed, and earlier than anything that was: this page joined the
  // stream after that work had already gone past. It happened; it was simply
  // not watched. Saying "skipped" here would be a false statement about the
  // review rather than a true one about the connection.
  if (firstPhase !== null && index < firstPhase) return 'unseen';

  if (finished) return 'skipped';
  if (index > latestPhase) return 'pending';
  if (index === latestPhase) return 'active';
  // Behind the front line and empty: the pipeline skipped it, which the panel
  // must say rather than leaving a gap the reader fills in with "passed".
  return 'skipped';
}

function isCheckStatus(value: string | null): value is CheckStatus {
  return value !== null && Object.hasOwn(STATUS_LABELS, value);
}

function recordCheck(event: ProgressEvent, tally: CheckTally, notable: ActivityLine[]): void {
  const raw = readText(event.detail, 'status');
  // A status the client does not know about is counted as settled and left
  // out of the breakdown rather than guessed at. A new backend status must
  // never silently land in the "pass" column.
  const status = isCheckStatus(raw) ? raw : null;
  const needsReview = readFlag(event.detail, 'needs_review') === true;
  const area = readText(event.detail, 'area');

  tally.settled += 1;

  // An observation is reported and never scored, so it belongs in neither the
  // pass/fail breakdown nor the list of things to act on.
  if (area === OBSERVATION_AREA) {
    tally.observations += 1;
    return;
  }

  if (needsReview) tally.needsPerson += 1;

  switch (status) {
    case 'pass':
      tally.pass += 1;
      break;
    case 'fail':
      tally.fail += 1;
      break;
    case 'partial':
      tally.partial += 1;
      break;
    case 'unable_to_validate':
    case 'missing_evidence':
      tally.unproven += 1;
      break;
    default:
      break;
  }

  // One line each for the outcomes a reviewer will act on, and nothing for
  // the ones they will not. Eighteen "passed" lines bury the two that matter.
  if (status !== 'fail' && status !== 'partial' && !needsReview) return;

  const label = area === null ? 'A check' : (AREA_LABELS[area] ?? area);
  const outcome = status === null ? 'needs a person' : STATUS_LABELS[status].toLowerCase();
  // Several checks inside one area can land on the same status, and the event
  // carries the area rather than the question. Repeating the identical
  // sentence three times reads as a rendering fault; counting them does not.
  const key = `check-${area ?? 'unknown'}-${status ?? 'review'}-${String(needsReview)}`;
  const existing = notable.find((line) => line.id === key);

  if (existing) {
    existing.count = (existing.count ?? 1) + 1;
    existing.text = `${label}: ${outcome} on ${String(existing.count)} checks${
      needsReview ? ', all going to a person' : ''
    }.`;
    return;
  }

  notable.push({
    id: key,
    kind: status === 'fail' ? 'attention' : 'finding',
    text: `${label}: ${outcome}${needsReview ? ', and is going to a person' : ''}.`,
    step: event.step,
    detail: event.detail,
    ts: event.ts,
    count: 1,
  });
}

function timeOf(ts: string): number {
  const value = new Date(ts).getTime();
  return Number.isFinite(value) ? value : Number.NaN;
}
