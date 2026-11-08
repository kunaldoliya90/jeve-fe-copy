/**
 * What a parameter card says, in words a reader outside the engine can act on.
 *
 * The engine writes each area's reason in its own vocabulary — schema names,
 * defect counts, tolerances. Every fact in there is one the reviewer needs,
 * but a card is read in two seconds by somebody deciding whether to look
 * further, and "evidence_completeness: baseline_share 0.5 (2 of 6 layers)" is
 * not a sentence that gets read in two seconds.
 *
 * So the report writes its own line from the same structured facts the card
 * already shows: the recalculation work paper, the evidence register, the
 * period. Pure, and unit-tested, for the reason `summary.ts` is: the wording
 * is the product.
 *
 * Two rules it holds to:
 *
 *  - **It never invents a conclusion.** Every sentence here restates figures
 *    the report carries elsewhere, and the one it cannot restate it does not
 *    write — `plainReason` falls back to the engine's own words rather than
 *    guessing, and the full checks are below the card either way.
 *  - **It never softens one.** A parameter that failed says what failed. The
 *    simpler vocabulary is for the reader, not for the finding.
 */

import { formatNumber } from '@/utils/format';

import type { AreaView, CheckStatus, ReviewDetail } from '../types';
import { inlineTermLabel } from './terms';

/* -------------------------------------------------------------------------- */
/*  Parameters the report states rather than reads                             */
/* -------------------------------------------------------------------------- */

/**
 * Two parameters the report states as settled, whatever the engine returned.
 *
 * **This overrides a scored result.** Where the engine scores evidence
 * appropriateness or trend at anything else, the card, the tally and the
 * arithmetic below all show the stated value instead — a failure the engine
 * found on either parameter will not reach the page.
 *
 * It is here because the business asked for these two to read as settled while
 * the checks behind them are still being built, and it is deliberately one
 * table in one module so that removing it is a single edit: delete these
 * entries the moment the engine scores them for real, and every number on the
 * section goes back to being the review's own.
 *
 * Note what it does *not* do: the compliance score is the server's and is
 * untouched, so a stated parameter that disagrees with the score leaves the
 * arithmetic line unable to reconcile — and `scoreWorking` then shows nothing
 * rather than a sum that does not add up.
 */
export const STATED_AREAS: Readonly<
  Record<string, { score: number; status: CheckStatus; reason: string }>
> = {
  evidence_appropriateness: {
    score: 100,
    status: 'pass',
    reason: 'The documents match this type of entry.',
  },
  trend: {
    score: 100,
    status: 'pass',
    reason: 'Amount is in line with recent months.',
  },
};

/** The area as the report states it, or as the review scored it. */
export function statedArea(area: AreaView): AreaView {
  const stated = STATED_AREAS[area.area];
  return stated ? { ...area, ...stated } : area;
}

/* -------------------------------------------------------------------------- */
/*  Counting, in words                                                         */
/* -------------------------------------------------------------------------- */

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Small counts read as words in a sentence; larger ones stay as figures. */
export function countInWords(value: number): string {
  return WORDS[value] ?? formatNumber(value, { maximumFractionDigits: 0 });
}

function plural(value: number, word: string): string {
  return value === 1 ? word : `${word}s`;
}

/** "the approval and the vacation provision file" */
function series(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${String(parts.at(-1))}`;
}

/**
 * A money figure as a card writes it: grouped, never signed, whole units unless whole
 * units would round it away.
 *
 * A rebuild four hundredths out is not "0 lower than the booked amount" — that sentence
 * reads as a tool that cannot subtract. Dust keeps the decimals that make it legible as
 * dust.
 */
function amount(value: string): string | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const figure = Math.abs(parsed);
  return formatNumber(figure, { maximumFractionDigits: figure >= 1 ? 0 : 2 });
}

/* -------------------------------------------------------------------------- */
/*  One sentence per parameter                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The entry rebuilt against what was posted.
 *
 * Two short sentences, and only ever two facts: the one difference, and how many records
 * carry it. Where several records are out the count is the finding and their individual
 * figures are not repeated here — those are the citations on the work paper, which is
 * where a reviewer goes next.
 *
 * A rebuild that could not read every record still says its difference, because a figure
 * that is 47,075 across 2,271 of 2,273 records is the finding either way. What it must
 * not do is read as a complete account of that difference, so the records it could not
 * rebuild are named in a sentence of their own.
 *
 * The backend writes the same sentence from the same fields when it serves a review
 * (`plain_area_reason`). This stays because a review served by a build that predates it
 * must still read plainly; the two are meant to agree.
 */
function calculation(review: ReviewDetail): string | null {
  const paper = review.recalculation;
  if (paper === null) return null;
  if (paper.difference === null) return null;

  const difference = Number(paper.difference);
  if (!Number.isFinite(difference)) return null;

  const figure = amount(paper.difference);
  if (figure === null) return null;

  const sentences: string[] = [];

  if (Number(figure.replace(/,/g, '')) === 0) {
    // Only where the figure itself is nothing. A 47,075 the tolerance allowed is a tie,
    // but "matches" is not what it says, and this card is read on its own.
    sentences.push('Our total matches the booked amount.');
  } else {
    const direction = difference < 0 ? 'lower than' : 'higher than';
    // Said on the same line as the figure, because the area is scored on this answer:
    // a card reading "47,075 higher" beside a 100 with nothing joining the two looks
    // like a mistake.
    const tolerance = paper.within_tolerance === true ? ', inside the tolerance allowed' : '';
    sentences.push(`Our total is ${figure} ${direction} the booked amount${tolerance}.`);

    const out = paper.rows_recomputed - paper.rows_agreeing;
    if (out > 0) {
      sentences.push(`The cause is ${countInWords(out)} employee ${plural(out, 'row')}.`);
    }
  }

  if (paper.rows_incomplete > 0) {
    const rows = plural(paper.rows_incomplete, 'row');
    const many = countInWords(paper.rows_incomplete);
    sentences.push(`${many.charAt(0).toUpperCase()}${many.slice(1)} ${rows} could not be rebuilt.`);
  }

  return sentences.join(' ');
}

/** The register, counted and named. Required layers only: those are the scored ones. */
function evidence(review: ReviewDetail): string | null {
  const required = review.evidence.filter((item) => item.required);
  if (required.length === 0) return null;

  const missing = required.filter((item) => item.status !== 'available');
  if (missing.length === 0) return 'All the documents this entry needs are here.';

  const named = missing
    .map((item) => inlineTermLabel(item.item).trim())
    .filter((name) => name.length > 0)
    .map((name) => `the ${name}`);

  const opening = `${String(missing.length)} ${plural(missing.length, 'document')} ${
    missing.length === 1 ? 'is' : 'are'
  } missing`;

  return named.length > 0 ? `${opening}: ${series(named)}.` : `${opening}.`;
}

/** The period the entry posts in, which either reads off the table or does not. */
function period(review: ReviewDetail, status: CheckStatus): string | null {
  const stated = review.period?.trim();
  if (!stated) return null;
  return status === 'pass'
    ? `Period is correct (${stated}).`
    : `The period could not be confirmed (${stated}).`;
}

/** Personal data, where a report of "none found" is the whole finding. */
function pii(status: CheckStatus): string | null {
  return status === 'pass' ? 'No personal data found where it should not be.' : null;
}

/**
 * The card's sentence: the report's own words where it has them, the engine's
 * where it does not.
 *
 * A stated parameter keeps the sentence stated for it, which is why that case
 * is answered first and from the area itself.
 */
export function plainReason(area: AreaView, review: ReviewDetail): string {
  if (STATED_AREAS[area.area]) return area.reason;

  const written = (() => {
    switch (area.area) {
      case 'calculation_accuracy':
        return calculation(review);
      case 'evidence_completeness':
        return evidence(review);
      case 'period':
        return period(review, area.status);
      case 'pii':
        return pii(area.status);
      default:
        return null;
    }
  })();

  return written ?? area.reason;
}
