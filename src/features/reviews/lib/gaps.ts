/**
 * The "could not be validated" lines, joined back to the checks they name.
 *
 * The engine writes these as one string each, in its own shorthand:
 *
 *   "population_complete is unable to validate: missing verdict."
 *
 * Every part of that is already somewhere else in the same payload, written
 * properly. `population_complete` is a check with a question on it — "Is every
 * in-scope employee present?" — and a status, and an area, and a conclusion.
 * The line was being printed at the reader verbatim, which asked them to know
 * the engine's identifiers in order to read the engine's report.
 *
 * So this module does the join the payload already supports: find the check
 * the line names, and hand the caller both. What the line adds beyond naming
 * the check — the reason it could not be settled — is kept and shown; what it
 * restates is dropped, because the check's own status badge says it better.
 *
 * Pure and tested for the same reason `summary.ts` is: it decides wording, and
 * wording that can be unit-tested cannot quietly rot back into jargon.
 *
 * A line that names nothing recognisable is passed through untouched. Guessing
 * at which check a line *probably* means would attach a reason to the wrong
 * finding, and there is no worse failure available here.
 */

import type { CheckView, ReviewDetail } from '../types';

export interface Gap {
  /** Stable within one parse, for React. */
  key: string;
  /** The line exactly as the review wrote it. */
  line: string;
  /** The check the line names, where it named one this review reported. */
  check: CheckView | null;
  /**
   * What the line says beyond naming the check: the reason nothing could be
   * established. Empty when the line carried no reason of its own.
   */
  detail: string;
}

/**
 * Every check this review reported, by id, wherever it was reported.
 *
 * A check can appear in more than one of these lists — one waiting on a person
 * is in `needs_person` *and* under its area — so the first sighting wins and
 * the areas are read first, where a check carries its full context.
 */
export function checksById(review: ReviewDetail): Map<string, CheckView> {
  const index = new Map<string, CheckView>();

  const record = (check: CheckView) => {
    if (!index.has(check.check_id)) index.set(check.check_id, check);
  };

  for (const area of review.areas) for (const check of area.checks) record(check);
  for (const check of review.observations) record(check);
  for (const check of review.needs_person) record(check);

  return index;
}

/** The identifier a line opens with, where it opens with one. */
const LEADING_ID = /^([a-z][a-z0-9]*(?:_[a-z0-9]+)*)\b/;

export function parseGaps(lines: readonly string[], byId: Map<string, CheckView>): Gap[] {
  return lines.map((line, index) => {
    const trimmed = line.trim();
    const id = LEADING_ID.exec(trimmed)?.[1];
    const check = (id === undefined ? undefined : byId.get(id)) ?? null;

    return {
      key: String(index),
      line: trimmed,
      check,
      detail: check === null ? '' : reasonFrom(trimmed),
    };
  });
}

/**
 * The reason, which this shorthand puts after a colon.
 *
 * Without one there is nothing to show: the remainder would be "is unable to
 * validate", which is the status badge spelled out as a sentence fragment.
 */
function reasonFrom(line: string): string {
  const at = line.indexOf(': ');
  if (at === -1) return '';

  const reason = line.slice(at + 2).trim();
  return reason.charAt(0).toUpperCase() + reason.slice(1);
}
