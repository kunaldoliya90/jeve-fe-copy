/**
 * The review API contract, mirrored from the backend.
 *
 * Hand-written rather than generated so the shapes the UI actually depends on
 * are visible in one file. Field names are `snake_case` because the API is —
 * one spelling end to end is one fewer thing to get wrong between two
 * codebases, and a mapping layer here would only hide drift.
 */

export type ReviewState =
  'queued' | 'running' | 'completed' | 'needs_review' | 'failed' | 'rejected';

/** Progress events. The stream closes when the review ends. */
export type SseEventName =
  | 'review_started'
  | 'step_started'
  | 'step_finished'
  | 'cache_hit'
  | 'ai_call'
  | 'check_finished'
  | 'review_completed'
  | 'review_failed';

export type CheckStatus = 'pass' | 'partial' | 'unable_to_validate' | 'missing_evidence' | 'fail';

/**
 * How risky the review found this entry, read off the band its score reached.
 *
 * A conclusion, not an input. It used to be typed on the upload form, which meant it was
 * blank on almost every review. Being derived from the score has one consequence a reader
 * must not miss: it is that score restated, so it corroborates nothing.
 */
export type RiskRating = 'high' | 'medium' | 'low';

export interface ReviewAccepted {
  review_id: string;
  status: ReviewState;
  events_url: string;
  reused_from: string | null;
}

export interface ProgressEvent {
  event: SseEventName;
  review_id: string;
  step: string;
  name: string;
  ts: string;
  /**
   * How far the review had got as of this event.
   *
   * Carried on the event as well as on the review detail so a client watching
   * the stream never shows a percentage that disagrees with the step it is
   * displaying next to it. Optional on the type because an older server does
   * not send it, in which case the polled detail is the only source.
   */
  progress_pct?: number;
  detail: Record<string, string | number | boolean | null>;
}

export interface SheetView {
  name: string;
  hidden: boolean;
  row_count: number;
  column_count: number;
  /** `null` when the format carries no formulas, which is not the same as zero. */
  formula_count: number | null;
  tables: number;
  headers: string[];
}

export interface WorkbookView {
  file_name: string;
  size_bytes: number;
  workbook_format: string;
  sheet_count: number;
  table_count: number;
  row_count: number;
  formulas_available: boolean;
  layout_fingerprint: string;
  defect_summary: string[];
  sheets: SheetView[];
  lineage: string[];
}

export interface CheckView {
  check_id: string;
  area: string;
  question: string;
  status: CheckStatus;
  decided_by: string;
  needs_review: boolean;
  review_reasons: string[];
  conclusion: string;
  exception_count: number;
  financial_impact: string | null;
  cells: string[];
}

export interface AreaView {
  area: string;
  weight: number;
  method: string;
  score: number;
  /**
   * The strictest status among the area's checks — not a restatement of the
   * score. An exception-rate area with three bad rows in forty thousand scores
   * in the nineties and still contains a failure, so a card badged from the
   * score alone would read as a pass.
   */
  status: CheckStatus;
  reason: string;
  checks: CheckView[];
}

export interface EvidenceView {
  item: string;
  /** What the layer is, in the business's words. */
  expected: string;
  /** Required layers are scored; recommended ones are reported only. */
  required: boolean;
  status: string;
  location: string | null;
  remediation: string | null;
  /** Why it reads as it does, written by code rather than by a model. */
  note: string;
}

/** One model call, metered and charged to the numbered step that made it. */
export interface AICallCostView {
  call: string;
  step: string;
  name: string;
  model: string;
  input_tokens: number;
  /** A subset of `input_tokens`, not an addition to it. */
  cached_tokens: number;
  output_tokens: number;
  /** A subset of `output_tokens`. */
  reasoning_tokens: number;
  /** Input plus output. Carried by the server so nobody double-counts the subsets. */
  total_tokens: number;
  cost_usd: string;
  latency_ms: number;
  schema_valid: boolean;
}

export interface CostView {
  ai_calls: number;
  total_tokens: number;
  total_usd: string;
  duration_ms: number;
  /** Every call in the order it was made. Empty on a fully deterministic run. */
  calls: AICallCostView[];
}

export interface ReviewDetail {
  review_id: string;
  status: ReviewState;
  file_name: string;
  created_at: string;

  /**
   * The earlier review this result came from, when the uploaded file was byte
   * for byte identical to one already reviewed under the same rules.
   *
   * The UI must say so. A reviewer whose upload returns a finished report in
   * two seconds is owed the reason, and "this is the earlier review's result"
   * is a materially different statement from "your file was reviewed just now"
   * — even though the bytes, and therefore the findings, are the same.
   */
  reused_from: string | null;

  /** The name the workbook was uploaded under, less its suffix. */
  document_number: string | null;
  /**
   * From the band the score reached, so it is `null` until the review has been scored.
   * The same fact as `band`, in one word, and never a second opinion on it.
   */
  risk_rating: RiskRating | null;
  je_type: string;
  je_type_name: string;
  je_type_variant: string | null;
  /** What step 9 left the identification at, after checking it against the file. */
  je_type_confidence: number;
  /**
   * True when a second, independent reading agreed the type, or when none was
   * available to disagree. False means the two readings differed and a person
   * is looking — the arithmetic is untouched either way.
   */
  je_type_corroborated: boolean;
  process: string;
  sub_process: string;
  /** Fiscal period read off the posting table by code. */
  period: string | null;

  step: string;
  progress_pct: number;
  score: number | null;
  band: string | null;
  provisional: boolean;
  headline: string;
  summary: string;
  workbook: WorkbookView | null;
  areas: AreaView[];
  /**
   * Checks that run and are deliberately never scored — PII and trend for this
   * entry type. Shown as parameters, badged as carrying no weight.
   */
  observations: CheckView[];
  evidence: EvidenceView[];
  needs_person: CheckView[];
  gaps: string[];
  next_steps: string[];
  /**
   * Numbers in the written summary that trace to no figure and no score.
   * Listed rather than removed: a sentence with the figure quietly deleted
   * reads as though it had been verified, which is worse for the reader than
   * being told which number to distrust.
   */
  untraced_numbers: string[];
  cost: CostView;
  /**
   * What did not happen on *this* review — a missing key, a format with no
   * formulas, a conditional step with nothing to work on.
   * The UI must surface these: a reader who mistakes an absent judgement for a
   * passed one has been misled, and that is the one failure an audit tool
   * cannot recover from.
   */
  not_yet_run: string[];
}

export interface ReviewSummary {
  review_id: string;
  file_name: string;
  je_type: string;
  status: ReviewState;
  score: number | null;
  band: string | null;
  provisional: boolean;
  created_at: string;
}

/** Terminal states. Polling and streaming both stop here. */
export const FINISHED_STATES: readonly ReviewState[] = [
  'completed',
  'needs_review',
  'failed',
  'rejected',
];

export function isFinished(status: ReviewState): boolean {
  return FINISHED_STATES.includes(status);
}

/** The review plan for a journal entry type, readable before any review runs. */
export interface CheckSpecView {
  check_id: string;
  area: string;
  question: string;
  /** `figures` needs no model at all; `judgement` does. */
  decided_by: 'figures' | 'judgement';
  risk: string;
  tool: string | null;
}

export interface AreaSpecView {
  area: string;
  weight: number;
  method: string;
  checks: CheckSpecView[];
}

export interface JETypeView {
  id: string;
  name: string;
  version: number;
  process: string;
  sub_process: string;
  objective: string;
  aliases: string[];
  areas: AreaSpecView[];
  observations: CheckSpecView[];
  evidence: EvidenceView[];
  check_count: number;
  figures_decided: number;
}

/** Human labels for the area keys the context file uses. */
export const AREA_LABELS: Record<string, string> = {
  evidence_completeness: 'Evidence completeness',
  population: 'Employee population',
  classification: 'FTE / non-FTE classification',
  salary_validation: 'Salary validation',
  leave_validation: 'Leave balance validation',
  accrual_reperformance: 'Accrual re-performance',
  je_reconciliation: 'Journal entry reconciliation',
  period: 'Period and cut-off',
};

/**
 * How an area arrives at its score, said as a sentence rather than named.
 *
 * It sits under the area's own name on the plan and on the result, where a
 * bare noun phrase — "Weakest check" — reads as something the review
 * concluded rather than as the rule it was scored under.
 */
export const METHOD_LABELS: Record<string, string> = {
  weakest_check: 'Scored by its weakest check',
  baseline_share: 'Scored by how much of the required evidence is present',
  exception_rate: 'Scored by the share of rows that came out as exceptions',
  impact_share: 'Scored by the share of value affected',
};

/**
 * How each status is worded on a parameter card.
 *
 * `unable_to_validate` and `missing_evidence` are never shortened to "fail".
 * They are different things — nothing was established, versus nothing was
 * supplied — and a reviewer acts on them differently.
 */
export const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: 'Pass',
  partial: 'Partial',
  unable_to_validate: 'Unproven',
  missing_evidence: 'No evidence',
  fail: 'Fail',
};

/** Human labels for the model calls, so a cost row says what it bought. */
export const AI_CALL_LABELS: Record<string, string> = {
  'AI-1': 'Independent reading',
  'AI-2': 'Plan proposal',
  'AI-3': 'Judging',
  'AI-4': 'Challenge',
  'AI-5': 'Report',
  'AI-M': 'Methodology reading',
  'AI-R': 'Screenshot reading',
  'AI-X': 'Exception grouping',
};

export const RISK_LABELS: Record<RiskRating, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * USD at the precision these calls actually cost.
 *
 * Four decimals below a dollar, because a whole review runs to a few cents and
 * rounding to the nearest cent would show most of the per-step rows as $0.01
 * and the cheap ones as $0.00 — which reads as free rather than as small.
 */
export function formatUsd(amount: string | number): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return '-';
  if (value === 0) return '$0.00';
  return value < 1 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}
