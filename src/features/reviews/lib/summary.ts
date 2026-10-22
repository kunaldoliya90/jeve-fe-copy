/**
 * The written summary, turned into something a reader can scan.
 *
 * What the engine produces is one paragraph of a hundred and fifty words with
 * schema names, defect counts and citation markers set in the middle of it:
 *
 *   "... with approval and vacation_provision_file missing (F-01). Manual
 *   update support failed with value_error: 882; typed_over_formula: 5;
 *   external_link: 1, and methodology support could not be matched ..."
 *
 * Every fact in there is one the reviewer needs. The paragraph is simply the
 * wrong shape for reading them: five separate findings arrive as one block,
 * the identifiers read as noise, and the figure that must not be quoted looks
 * exactly like the four that may be.
 *
 * So this module re-lays the paragraph out. It is deliberately pure — no
 * React, no DOM — for the same reason `narrative.ts` is: the wording is the
 * product, and wording that can be unit-tested cannot quietly rot.
 *
 * The one rule it holds to absolutely: **nothing is reworded and nothing is
 * dropped.** Sentences are split at sentence boundaries, identifiers are
 * respaced, citations are moved to the end of the line they were already in.
 * The reader is not shown a paraphrase of an audit finding, and the component
 * keeps the verbatim paragraph one disclosure away so the original is always
 * recoverable.
 *
 * Where it does make a judgement — which lines to mark as carrying a problem
 * — it can only over-mark, never under-mark. A line is flagged when it
 * contains a word for something going wrong, and is otherwise left plain. It
 * never concludes that anything passed: "nothing was established" and "this
 * is fine" are different findings, and prose matching is not good enough to
 * tell them apart.
 */

import { inlineTermLabel } from './terms';

/* -------------------------------------------------------------------------- */
/*  Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export type SummarySegment =
  /** Prose, exactly as written. */
  | { kind: 'text'; text: string }
  /** A machine identifier, respaced, with the id it came from kept. */
  | {
      kind: 'term';
      text: string;
      raw: string;
      /** The count written against it, where the sentence had one. */
      count: string | null;
      countUntraced: boolean;
    }
  /** A figure the report could not trace to any evidence or score. */
  | { kind: 'figure'; text: string };

/**
 * `attention` means the line contains a word for something going wrong.
 * There is deliberately no third value for "this went well" — see above.
 */
export type SummaryTone = 'attention' | 'plain';

export interface SummaryPoint {
  /** Stable within one parse, for React. */
  key: string;
  tone: SummaryTone;
  /** The opening clause, where the sentence led with a short plain one. */
  lead: string | null;
  body: SummarySegment[];
  /** Citation markers that were written inline, lifted out and de-duplicated. */
  cites: string[];
}

/* -------------------------------------------------------------------------- */
/*  Splitting                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A sentence ends at `.`, `!` or `?` followed by a space and something that
 * starts a new sentence.
 *
 * The lookahead is what keeps `37.5 because` and `1638.20 in total` whole:
 * a decimal point is never followed by a space, and the sentences that follow
 * a real stop begin with a capital, a digit, a quote or a bracket.
 */
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=["'(\p{Lu}\d])/u;

/** List markers a backend that switches to bullets would put on each line. */
const LEADING_MARKER = /^[\s•*-]+/;

export function splitSentences(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .flatMap((line) => line.split(SENTENCE_BREAK))
    .map((part) => part.replace(LEADING_MARKER, '').trim())
    .filter((part) => part.length > 0);
}

/* -------------------------------------------------------------------------- */
/*  Citations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `(F-01)`, as the summary writes it.
 *
 * Lifted to the end of its line rather than rewritten, because what the
 * reference points at is the report's business and not this module's. The
 * same marker is usually repeated on every sentence, which is three-quarters
 * of why the paragraph reads as cluttered.
 */
const CITATION = /\s*\(([A-Z]{1,3}-\d{1,3})\)/g;

function stripCitations(text: string): { text: string; cites: string[] } {
  const cites: string[] = [];
  const stripped = text
    .replace(CITATION, (_whole: string, ref: string) => {
      if (!cites.includes(ref)) cites.push(ref);
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { text: stripped, cites };
}

/* -------------------------------------------------------------------------- */
/*  Identifiers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A `snake_case` identifier, with the count written against it where there is
 * one: `value_error: 882`. Requires at least one underscore, so an ordinary
 * lower-case word is never mistaken for a schema name.
 *
 * The count spells out its thousands separators rather than allowing any run
 * of digits and commas: `external_link: 1,` ends a clause, and a count that
 * swallowed the comma would take the sentence's punctuation with it.
 */
const TERM = /\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b(?:\s*:\s*(\d+(?:,\d{3})*(?:\.\d+)?))?/g;

/* -------------------------------------------------------------------------- */
/*  The opening clause                                                         */
/* -------------------------------------------------------------------------- */

/** Longer than this is a sentence, not a label, and reads badly emphasised. */
const LEAD_MAX = 64;

/**
 * "Negative accruals are not cleared: 3 employee row(s) carry ..." leads with
 * a clause that is the finding in five words. Worth setting apart.
 *
 * Guarded hard, because the other thing a colon introduces in this corpus is
 * a defect count — `value_error: 882` — and emphasising half of one of those
 * would be nonsense. A lead must be short, and must hold no digits and no
 * identifier.
 */
function splitLead(sentence: string): { lead: string | null; rest: string } {
  const at = sentence.indexOf(': ');
  if (at === -1 || at > LEAD_MAX) return { lead: null, rest: sentence };

  const lead = sentence.slice(0, at);
  if (/[\d_]/.test(lead)) return { lead: null, rest: sentence };

  const rest = sentence.slice(at + 2).trim();
  if (rest.length === 0) return { lead: null, rest: sentence };

  return { lead, rest };
}

/* -------------------------------------------------------------------------- */
/*  Tone                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Words that mean something did not go well.
 *
 * Chosen to be unambiguous in this corpus and nowhere near exhaustive. A line
 * this misses is shown plain, with its own words intact — the finding is still
 * there to read. The failure this list must never have is the opposite one, so
 * nothing here is conditional on a negation it might read backwards.
 */
const ATTENTION_MARKERS = [
  'missing',
  'absent',
  'not present',
  'incomplete',
  'failed',
  'failure',
  'fails',
  'exception',
  'breach',
  'could not',
  'cannot',
  'unable',
  'did not',
  'not cleared',
  'not matched',
  'unresolved',
  'mismatch',
  'discrepan',
  'differs',
  'differed',
  'negative',
  'overstat',
  'understat',
  'needs a person',
  'need a person',
  'no evidence',
];

function toneOf(sentence: string): SummaryTone {
  const lower = sentence.toLowerCase();
  return ATTENTION_MARKERS.some((marker) => lower.includes(marker)) ? 'attention' : 'plain';
}

/* -------------------------------------------------------------------------- */
/*  Untraced figures                                                           */
/* -------------------------------------------------------------------------- */

/**
 * True when `token` sits at `at` as a whole figure rather than inside a longer
 * one — so `20` does not match inside `1638.20`, while `1638.20` still matches
 * at the end of a sentence, where the next character is the full stop.
 */
function standsAlone(text: string, at: number, token: string): boolean {
  const before = text.charAt(at - 1);
  const after = text.charAt(at + token.length);
  const afterThat = text.charAt(at + token.length + 1);

  if (/\d/.test(before) || before === '.' || before === ',') return false;
  if (/\d/.test(after)) return false;
  if ((after === '.' || after === ',') && /\d/.test(afterThat)) return false;

  return true;
}

/**
 * Mark the figures that trace to nothing, leaving every other character alone.
 *
 * Matched by exact string rather than by parsing the numbers: the report names
 * these figures the way the summary wrote them, and `918273.45` must be found
 * as those characters, not as a value that might be re-formatted on the way
 * back out.
 */
function markFigures(text: string, untraced: readonly string[]): SummarySegment[] {
  if (text.length === 0) return [];
  if (untraced.length === 0) return [{ kind: 'text', text }];

  const segments: SummarySegment[] = [];
  let rest = text;

  while (rest.length > 0) {
    let foundAt = -1;
    let found = '';

    for (const figure of untraced) {
      if (figure.length === 0) continue;

      for (let from = 0; from <= rest.length;) {
        const at = rest.indexOf(figure, from);
        if (at === -1) break;
        if (standsAlone(rest, at, figure)) {
          if (foundAt === -1 || at < foundAt || (at === foundAt && figure.length > found.length)) {
            foundAt = at;
            found = figure;
          }
          break;
        }
        from = at + figure.length;
      }
    }

    if (foundAt === -1) {
      segments.push({ kind: 'text', text: rest });
      break;
    }

    if (foundAt > 0) segments.push({ kind: 'text', text: rest.slice(0, foundAt) });
    segments.push({ kind: 'figure', text: found });
    rest = rest.slice(foundAt + found.length);
  }

  return segments;
}

/* -------------------------------------------------------------------------- */
/*  Segmenting                                                                 */
/* -------------------------------------------------------------------------- */

function segment(text: string, untraced: readonly string[]): SummarySegment[] {
  const segments: SummarySegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(TERM)) {
    const [whole, id, count] = match;
    if (id === undefined) continue;

    segments.push(...markFigures(text.slice(cursor, match.index), untraced));

    const label = inlineTermLabel(id);
    segments.push({
      kind: 'term',
      // Only when the identifier opens the sentence, where the lower-case
      // in-sentence wording would otherwise read as a typo.
      text: match.index === 0 ? label.charAt(0).toUpperCase() + label.slice(1) : label,
      raw: id,
      count: count ?? null,
      countUntraced: count !== undefined && untraced.includes(count),
    });

    cursor = match.index + whole.length;
  }

  segments.push(...markFigures(text.slice(cursor), untraced));
  return segments;
}

/* -------------------------------------------------------------------------- */
/*  The parse                                                                  */
/* -------------------------------------------------------------------------- */

export interface InlineText {
  segments: SummarySegment[];
  cites: string[];
}

/**
 * One short piece of engine-written text, read as a phrase rather than as a
 * paragraph: an area's reason, a check's conclusion.
 *
 * The same identifier respacing the summary gets, because the same schema
 * names turn up in all of them and a reader should not meet
 * `typed_over_formula` worded one way in the summary and another on the card
 * below it. Not split into sentences and not toned: a conclusion is one
 * statement, already attached to a status badge that says how it went.
 */
export function parseInline(text: string, untraced: readonly string[] = []): InlineText {
  const { text: stripped, cites } = stripCitations(text);
  return { segments: segment(stripped, untraced), cites };
}

/**
 * Turn the written summary into points a reader can scan.
 *
 * Returns an empty array for an empty summary, which the caller renders as
 * "nobody wrote one" rather than as a report with nothing wrong with it.
 */
export function parseSummary(summary: string, untraced: readonly string[] = []): SummaryPoint[] {
  return splitSentences(summary).map((sentence, index) => {
    const { text: stripped, cites } = stripCitations(sentence);
    const { lead, rest } = splitLead(stripped);

    return {
      key: String(index),
      // Read off the whole sentence, so a lead that was split off still counts.
      tone: toneOf(stripped),
      lead,
      body: segment(rest, untraced),
      cites,
    };
  });
}
