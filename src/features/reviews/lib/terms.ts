/**
 * The one place a machine identifier becomes words.
 *
 * The engine names things the way a schema does — `typed_over_formula`,
 * `vacation_provision_file`, `value_error` — and those names reach the UI in
 * two very different places: standing alone as a row label, and buried inside
 * a sentence the model wrote. The same id needs different wording in each
 * ("Numbers typed over a calculated column" is a fine row label and an awful
 * clause), so both registers live here rather than one per screen. Three
 * screens had already drifted into three words for one status; this is the
 * same trap one level down.
 *
 * Two rules hold for everything in this module:
 *
 *  - An id nobody has worded is shown as the id, spaced out — never guessed
 *    at. A plausible-looking label invented from a name is exactly the kind of
 *    thing a reader would quote in a meeting.
 *  - The raw id stays available to the caller, so whatever is rendered can
 *    carry the original for anyone who needs to match it against the file.
 */

/** How an id is worded where it stands on its own, as a row or column label. */
export const TERM_LABELS: Record<string, string> = {
  typed_over_formula: 'Numbers typed over a calculated column',
  value_error: 'Cells holding #VALUE!',
  ref_error: 'Broken references (#REF!)',
  na_error: 'Cells holding #N/A',
  external_link: 'Links to another workbook',
};

/**
 * The same ids, worded to sit inside a sentence.
 *
 * Lower case and shorter, because these are read mid-clause. Only the ids
 * whose row label would read badly in prose need an entry; everything else
 * falls through to the shared de-underscoring below, which is a formatting
 * change rather than a translation and so cannot say anything untrue.
 */
const INLINE_TERM_LABELS: Record<string, string> = {
  typed_over_formula: 'numbers typed over a formula',
  value_error: 'cells holding #VALUE!',
  ref_error: 'broken references (#REF!)',
  na_error: 'cells holding #N/A',
  external_link: 'links to another workbook',
};

/** `employee_master` -> `employee master`. Spacing only; no words are chosen. */
function spaced(id: string): string {
  return id.replaceAll('_', ' ').trim();
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The label for an id standing on its own. */
export function termLabel(id: string): string {
  return TERM_LABELS[id] ?? capitalise(spaced(id));
}

/**
 * The label for an id inside a sentence.
 *
 * Falls through to the spaced id rather than to the row label lower-cased: a
 * label like "Cells holding #VALUE!" carries a literal Excel token, and
 * case-folding one of those produces a string that does not exist in any
 * spreadsheet.
 */
export function inlineTermLabel(id: string): string {
  return INLINE_TERM_LABELS[id] ?? spaced(id);
}
