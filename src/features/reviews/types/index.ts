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

/**
 * One worked example behind a check's conclusion: a row the check actually looked at.
 *
 * Not every tool's sample carries every field — a row-level re-performance has all
 * five, a tool comparing something else (an account, a posting date) has fewer — so
 * a field a given sample does not carry arrives as `null` rather than forcing a shape
 * no tool actually has.
 */
export interface FigureSampleView {
  row: number | null;
  cell: string | null;
  expected: string | null;
  actual: string | null;
  difference: string | null;
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
  /** Worst-first, the rows behind the conclusion — the same ones `cells` is made from. */
  samples: FigureSampleView[];
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
  /**
   * The entry recalculation work paper: the posted amount regenerated from the
   * formula the business approved, record by record, against what was actually
   * booked. `null` when the entry type states no formula, when the working
   * could not be bound, and on any review stored before it existed.
   */
  recalculation: EntryRecalculation | null;
  /**
   * The category split work paper: the arithmetic behind the parameters above.
   * `null` when the workbook bound no table whose rows could be re-added, and
   * on any review stored before the work paper existed.
   */
  split_summary: SplitSummary | null;
  /**
   * Checks the review could not establish either way.
   *
   * Optional because the field is not in every response the deployed API
   * returns, and `getReview` casts rather than validates - a required type
   * here is an assertion nothing enforces at runtime, which is what turned a
   * missing key into a white screen. Read it through `?.` and treat absent as
   * empty: a review with no gaps and a review whose gaps were never sent both
   * have nothing to show.
   */
  gaps?: string[];
  needs_person: CheckView[];
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

/* -------------------------------------------------------------------------- */
/*  The entry recalculation work paper                                        */
/* -------------------------------------------------------------------------- */

/**
 * What a declared input is measured in. Stated by the business, never inferred.
 */
export type RecalcUnit = 'currency' | 'days' | 'months' | 'currency_per_day' | 'rate' | 'count';

/** Why one record is on the work paper. The three are acted on differently. */
export type DiscrepancyKind = 'stated_differs' | 'input_missing' | 'stated_missing';

export type BookedMethod = 'posting_debits' | 'stated_fact';

/** One number a citation rests on, and the cell it was read from. */
export interface CitedValue {
  /** The name the approved formula refers to it by. */
  id: string;
  /** The column header, as the preparer wrote it. */
  label: string;
  /** e.g. `AB9`. Empty for a constant the business states rather than a column. */
  cell: string;
  value: string | null;
  unit: RecalcUnit;
}

/** One record that did not reconcile, in the form a reviewer can act on. */
export interface RecalcCitation {
  row: number;
  sheet: string;
  kind: DiscrepancyKind;
  /** `null` when an input was missing, so nothing was produced for the row. */
  recomputed: string | null;
  stated: string | null;
  stated_cell: string;
  difference: string | null;
  difference_pct: number | null;
  /** Why this row is here, written by code from the figures. Never by a model. */
  why: string;
  inputs: CitedValue[];
  /** Ids of the inputs that did not resolve on this row. */
  missing: string[];
}

/**
 * One row also cited by a different check that reads this same table.
 *
 * Merged in by row number from that check's own (already worst-first, capped) citations. A
 * row with no flag here may still differ on that check if its citation list was capped
 * before reaching this row — that check's own `citation_count` on `RelatedRecalcCheck`, not
 * this, is where the full count lives.
 */
export interface RowFlag {
  check_id: string;
  label: string;
  cell: string;
  expected: string | null;
  actual: string | null;
  difference: string | null;
  why: string;
}

/**
 * One record of the full recalculation pass — not just the worst twelve.
 *
 * `RecalcCitation` above exists to be printed, so the server keeps only a bounded, worst-first
 * sample of them. This exists to be browsed: every record, paged and grouped from the
 * `/recalculation/rows/` and `/recalculation/groups/` endpoints. The same no-employee-reference
 * rule applies here as everywhere else in this work paper — a row number, nothing more.
 */
export interface RecalcRow {
  row: number;
  /** Grouping dimension -> its value on this row, e.g. `{ cost_center: 'CC100' }`. */
  group: Record<string, string>;
  recomputed: string | null;
  stated: string | null;
  stated_cell: string;
  difference: string | null;
  difference_pct: number | null;
  /** `null` when the row agrees within tolerance. */
  kind: DiscrepancyKind | null;
  inputs: CitedValue[];
  /** Each derived term's own value on this row, same shape as an input. */
  terms: CitedValue[];
  /** Citations from other checks reading this same table, merged in by row. */
  flags: RowFlag[];
}

/** One page of a recalculation's rows, in whatever filter and order were asked for. */
export interface RecalcRowPage {
  rows: RecalcRow[];
  /** Rows matching the filter, before paging. */
  total: number;
  /** Pass back as the `cursor` param to fetch the next page. `null` on the last page. */
  next_cursor: string | null;
}

/** One distinct value of a grouping dimension, rolled up from the rows inside it. */
export interface RecalcGroupSummary {
  /** The dimension's value, e.g. a cost centre. Empty string when a row carried none. */
  value: string;
  rows: number;
  /** Rows in this group carrying a finding. */
  flagged: number;
  recomputed_total: string;
  stated_total: string;
  difference: string;
}

/** One declared input, and what this particular workbook carries for it. */
export interface RecalcInputReading {
  id: string;
  meaning: string;
  unit: RecalcUnit;
  source: string;
  description: string;
  /** Whether the formula cannot be evaluated without it. */
  required: boolean;
  bound: boolean;
  column: string;
  header: string;
  rows_present: number;
  rows_missing: number;
}

/** One term of the formula, totalled, so the recomputed figure comes apart. */
export interface RecalcComponent {
  id: string;
  /** A short name for the stage, as the business declared it. */
  label: string;
  /** What the stage is and why, in the business's own words. May be empty. */
  description: string;
  expression: string;
  /**
   * The same expression with every name replaced by the one a reader sees it as: an
   * input by the header the preparer wrote, an earlier stage by its own label.
   */
  in_headers: string;
  unit: RecalcUnit;
  total: string;
  rows_populated: number;
  number_format: string | null;
}

/**
 * A term re-performed from its inputs and compared, row by row, against the
 * column the workbook computes for the same quantity.
 *
 * The strongest evidence the paper carries, and never the decisive one: it says
 * a leg of the formula was performed the way the business states it, which is
 * not the same claim as the entry reconciling.
 */
export interface RecalcCorroboration {
  term: string;
  against: string;
  label: string;
  rows_compared: number;
  rows_agreeing: number;
  impact: string;
  first_example: string;
  /** Every row compared and every one of them tied. Nothing less corroborates. */
  agrees: boolean;
}

/**
 * Another check that reads the same table as the entry recalculation, surfaced beside it.
 *
 * A different formula is a different question, so this is never merged into the entry-level
 * comparison above — but a reviewer reading "the records rebuilt" is owed every other
 * arithmetic finding on these same records, not just this one formula's. `citations` reuses
 * `RecalcCitation`, the identical Row/Cell/Recomputed/Stated/Difference shape Block C below
 * already renders.
 */
export interface RelatedRecalcCheck {
  check_id: string;
  /** The check's own question, for a reader's header. */
  label: string;
  /** The check's own conclusion, written by code. */
  summary: string;
  /** Worst first, capped the same way this check capped them for itself. */
  citations: RecalcCitation[];
  /** Rows this check found differing, in full. */
  citation_count: number;
}

export interface BookedAmount {
  method: BookedMethod;
  /** `null` when it could not be read at all, which is not a pass. */
  total: string | null;
  description: string;
  table: string;
  sheet: string;
  lines: number;
  accounts: string[];
}

export interface RecalcExplainedStep {
  label: string;
  detail: string;
  /** That step, carried out on the same fixed example throughout. */
  example: string;
}

/**
 * The formula walked through in plain language, for a reader who has never seen it.
 *
 * Fixed and business-authored, like `RecalcBasis.worked_example` beside it - never
 * recomputed from this particular review, so it reads the same on every review of this
 * entry type.
 */
export interface RecalcExplained {
  intro: string;
  context: string;
  steps: RecalcExplainedStep[];
  summary: string;
  caveats: string[];
}

export interface RecalcBasis {
  table: string;
  sheet: string;
  header_row: number;
  first_row: number;
  last_row: number;
  /** The meaning that separates a record from the subtotal rows beneath it. */
  record_key: string;
  /** The column holding the workbook's own amount per record. */
  stated_column: string;
  stated_header: string;
  /** As the entry type declares it. */
  formula: string;
  /**
   * The formula with every derived stage written out, down to the columns themselves, in
   * the headers this workbook uses. The form that shows which columns the arithmetic
   * actually reads, since a stage name hides the columns behind it.
   */
  formula_expanded: string;
  /** The same formula in the preparer's column names: a substitution, not a translation. */
  formula_in_headers: string;
  sign: string;
  currency: string;
  rounding: string;
  day_count: string;
  tolerance_pct: string;
  tolerance_amount: string;
  row_tolerance: string;
  worked_example: string;
  /** `null` for a JE type that has not had this walkthrough written for it yet. */
  explained: RecalcExplained | null;
  /**
   * True until the business has signed the formula and the tolerance off. The
   * UI must say so: a pass under a basis nobody has approved is not a pass.
   */
  provisional_basis: boolean;
}

/**
 * The posted amount, regenerated from the inputs the business approved.
 *
 * Every figure here was produced by code from the workbook's own cells: the
 * recomputed side by evaluating the approved formula over each record of the
 * working, the booked side by summing the debit lines of the posted entry. Two
 * readings of two different tables, which is what makes the difference between
 * them mean something.
 */
export interface EntryRecalculation {
  basis: RecalcBasis;
  status: CheckStatus;
  /** The outcome in a sentence, written by code from the figures. */
  explanation: string;
  recomputed_total: string;
  booked: BookedAmount;
  difference: string | null;
  difference_pct: number | null;
  /** `null` when there was nothing to compare, which is not a pass. */
  within_tolerance: boolean | null;
  rows_total: number;
  rows_recomputed: number;
  rows_incomplete: number;
  rows_agreeing: number;
  row_impact: string;
  inputs: RecalcInputReading[];
  components: RecalcComponent[];
  corroborations: RecalcCorroboration[];
  /** Worst first, capped for reading. `citation_count` is the full number. */
  citations: RecalcCitation[];
  citation_count: number;
  /**
   * Faults in the workbook's own arithmetic, found after the rebuild.
   *
   * The one of these a figure cannot hide is `different_inputs`: a column built from the
   * wrong columns still produces the right total on every record where the missing input
   * happens to be zero, so the entry reconciles and every other check passes.
   */
  formula_findings: FormulaFinding[];
  /**
   * Columns whose formulas were examined. `0` means the audit could not run, which is not
   * the same as finding nothing wrong — the UI must not render those alike.
   */
  formula_columns_audited: number;
  notes: string[];
  duration_ms: number;
  /** Every record rebuilt. A partial recalculation can never support a pass. */
  complete: boolean;
  /** Regenerated to within tolerance, over every record. */
  ties: boolean;
  /**
   * Other checks that read this same table, surfaced beside the entry-level comparison
   * above. Never merged into `recomputed_total`/`difference` — a different formula is a
   * different question.
   */
  related_checks: RelatedRecalcCheck[];
}

/**
 * What is wrong with a formula the workbook applies.
 *
 * None of these is a reading of what the formula *meant*: the server neither evaluates
 * Excel nor judges intent. Each is a structural fact about cells.
 */
export type FormulaFault =
  'not_calculated' | 'inconsistent' | 'typed_over' | 'different_inputs' | 'unreadable';

export interface FormulaFinding {
  fault: FormulaFault;
  sheet: string;
  column: string;
  /** The column's header, as the preparer wrote it. */
  header: string;
  /** Where to open the file. */
  cell: string;
  /** The formula as written in that cell. */
  formula: string;
  /** The same formula with each reference replaced by the header of the column it reads. */
  in_headers: string;
  /** The approved arithmetic in the same form. Empty where the business declares none. */
  expected: string;
  rows_affected: number;
  rows_checked: number;
  /** What it means for the review, in a sentence written by code. */
  why: string;
}

/**
 * How each fault is worded, and how it is weighted.
 *
 * `not_calculated` is deliberately not an error: a workbook whose figures arrive from a
 * payroll extract is the normal case for this entry type, and the finding is a limit of the
 * evidence rather than a defect. `different_inputs` is the serious one — it is the only
 * fault here that a figure which ties cannot hide.
 */
export const FORMULA_FAULT_LABELS: Record<FormulaFault, string> = {
  different_inputs: 'Wrong inputs',
  inconsistent: 'Inconsistent down the column',
  typed_over: 'Typed over the formula',
  not_calculated: 'Not calculated in this file',
  unreadable: 'Formulas could not be read',
};

export const FORMULA_FAULT_TONE: Record<FormulaFault, 'danger' | 'warning' | 'neutral'> = {
  different_inputs: 'danger',
  inconsistent: 'warning',
  typed_over: 'warning',
  not_calculated: 'neutral',
  unreadable: 'neutral',
};

/** How each unit is worded beside an input. The unit itself comes from the server. */
export const UNIT_LABELS: Record<RecalcUnit, string> = {
  currency: 'Amount',
  days: 'Days',
  months: 'Months',
  currency_per_day: 'Amount per day',
  rate: 'Rate',
  count: 'Count',
};

/**
 * How each kind of discrepancy is worded.
 *
 * Never collapsed into "exception": an amount that differs is a finding, an
 * input that is missing is a data gap, and a record the file states nothing for
 * is neither — and a reviewer clears the three of them differently.
 */
export const DISCREPANCY_LABELS: Record<DiscrepancyKind, string> = {
  stated_differs: 'Amount differs',
  input_missing: 'Input missing',
  stated_missing: 'Nothing stated',
};

export const BOOKED_METHOD_LABELS: Record<BookedMethod, string> = {
  posting_debits: 'Debit side of the posted entry',
  stated_fact: 'A control total the entry states',
};

/* -------------------------------------------------------------------------- */
/*  The category split work paper                                             */
/* -------------------------------------------------------------------------- */

/**
 * The entry's value re-added from the rows of the working and divided by the
 * classes the workbook itself sorts them into.
 *
 * Nothing in these shapes is a label this codebase chose. `header` is the text
 * the preparer typed at the top of the column, `CategoryRef.label` is how the
 * file spells that class, and `number_format` is Excel's own format string for
 * the column. A workbook that calls its classes `Permanent` and `Temp` renders
 * correctly with no edit here, and that is the point — a mapping table in this
 * file would be a second place for the vocabulary to go stale.
 */
export interface SplitBasis {
  /** The name the entry type binds this table under. */
  table: string;
  sheet: string;
  header_row: number;
  first_row: number;
  last_row: number;
  /**
   * Rows that carried a class and were summed. Below `rows_total` whenever the
   * block reaches past the last record — the rows beneath it are the
   * preparer's own subtotals, and nothing treats those as records that failed
   * to classify.
   */
  rows_read: number;
  rows_total: number;
  classification_header: string;
  classification_column: string;
  /**
   * The meaning the sheet map bound the class column to. `null` means the
   * column was picked by shape instead, which the UI must say: it is the
   * fallback, and a reader is owed the difference.
   */
  classification_meaning: string | null;
  tolerance: string;
  /** `false` for a binary workbook, which carries no formulas to read rules from. */
  formulas_available: boolean;
}

export interface CategoryRef {
  /** Case-folded. Joins to the keys of `ComponentSplit.amounts`. */
  key: string;
  /** The first spelling the file uses. What a reader sees. */
  label: string;
  row_count: number;
}

export interface ComponentSplit {
  /** The column's own header text — the row title, in the preparer's words. */
  header: string;
  column: string;
  meaning: string | null;
  /** Excel's format string, so the UI renders the column the way the file does. */
  number_format: string | null;
  /** Keyed by `CategoryRef.key`. Only the classes that actually occur appear. */
  amounts: Record<string, string>;
  total: string;
  rows_populated: number;
  /** Each class against the component total. Empty when the total is zero. */
  shares: Record<string, number>;
}

export interface SplitTieOut {
  label: string;
  /** Where the stated total sits, e.g. `AU7`. */
  cell: string;
  stated: string | null;
  recomputed: string;
  variance: string | null;
  /** `null` when there was nothing to compare, which is not a pass. */
  within_tolerance: boolean | null;
  /**
   * Whether the stated total calculates itself. `null` on a format that
   * carries no formulas — "nobody can tell" is not "typed by hand", and the
   * UI must never render the two the same way.
   */
  stated_is_formula: boolean | null;
}

export interface DerivedRule {
  column: string;
  /** The row it was read off, which is the row to open the file at. */
  row: number;
  header: string;
  /** As written in the cell. */
  formula: string;
  /** The same formula with each reference replaced by that column's header. */
  in_headers: string;
  reads: string[];
}

export interface WalkStep {
  header: string;
  column: string;
  cell: string;
  value: string | null;
  number_format: string | null;
  /** `null` when the cell is a typed constant rather than a calculation. */
  formula: string | null;
  in_headers: string | null;
}

/** One row of the working, traced. A row number and never an identifier. */
export interface RowWalkthrough {
  row: number;
  why: string;
  category: string;
  /** Header and value for the columns that describe the row without naming it. */
  context: [string, string][];
  steps: WalkStep[];
}

export interface ExceptionTest {
  check_id: string;
  question: string;
  area: string;
  tool: string;
  rows_total: number;
  rows_checked: number;
  flagged: number;
  /** Read off the weight the business gave the area. */
  severity: 'high' | 'medium' | 'info';
  /** The status the engine reached, carried across rather than re-derived. */
  status: CheckStatus;
  financial_impact: string | null;
  first_example: string | null;
  conclusion: string;
}

export interface SplitSummary {
  basis: SplitBasis;
  categories: CategoryRef[];
  components: ComponentSplit[];
  tie_outs: SplitTieOut[];
  rules: DerivedRule[];
  walkthroughs: RowWalkthrough[];
  tests: ExceptionTest[];
  /**
   * What the work paper could not do, said in words. Rendered rather than
   * dropped: a missing rules block with no note reads as a workbook with no
   * formulas in it.
   */
  notes: string[];
}

/** How a test's severity is worded. The grade itself comes from the server. */
export const SEVERITY_LABELS: Record<ExceptionTest['severity'], string> = {
  high: 'High',
  medium: 'Medium',
  info: 'Information',
};

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

/**
 * Human labels for the area keys the context file uses.
 *
 * `evidence_appropriateness`, `calculation_accuracy`, `pii` and `trend` are the
 * four areas the six-parameter model (version 7 of the vacation accrual
 * context) introduced. The five they replaced — `population`, `classification`,
 * `salary_validation`, `leave_validation` and `je_reconciliation` — stay in
 * this map rather than being deleted: a review is written once and never
 * updated, so a record stored under an earlier version of the context still
 * carries those keys forever, and this is the only place that renders them.
 */
export const AREA_LABELS: Record<string, string> = {
  evidence_completeness: 'Evidence completeness',
  evidence_appropriateness: 'Evidence appropriateness',
  calculation_accuracy: 'Calculation accuracy',
  pii: 'PII assessment',
  trend: 'Trend analysis',
  period: 'Period',
  // Superseded by `calculation_accuracy` — kept for reviews stored before the
  // six-parameter model.
  population: 'Employee population',
  classification: 'FTE / non-FTE classification',
  salary_validation: 'Salary validation',
  leave_validation: 'Leave balance validation',
  accrual_reperformance: 'Accrual re-performance',
  je_reconciliation: 'Journal entry reconciliation',
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
  'AI-E': 'Evidence appropriateness',
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
