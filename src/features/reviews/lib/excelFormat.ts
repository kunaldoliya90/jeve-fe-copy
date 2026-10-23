/**
 * Render a number the way the workbook renders it, from Excel's own format string.
 *
 * The alternative was a lookup table in this codebase saying which columns are
 * money, which are days and which are percentages. That table would have had to
 * be written per entry type, per country and per period, and it would have been
 * wrong the first time a preparer added a column — so the format travels with
 * the figure instead, and this module is the only thing that reads it.
 *
 * It implements the part of the format grammar these workbooks actually use:
 * the four semicolon-separated sections, decimal places, thousands grouping,
 * a percent scale, parentheses for negatives, and the accounting dash for zero.
 * Everything else degrades to a grouped decimal rather than throwing, because a
 * format nobody anticipated must still produce a readable figure.
 *
 * It deliberately does *not* implement colour codes, fill characters, fractions,
 * dates or conditional formats. A number is rendered; it is never styled from
 * the file, because a red negative in a workbook is the preparer's emphasis and
 * this report has its own meaning for red.
 */

import { formatNumber } from '@/utils/format';

/** Excel's default: a number formatted as whatever it happens to be. */
const GENERAL = 'General';

export interface NumberShape {
  /** Decimal places the column is written to. */
  decimals: number;
  /** Whether the pattern groups thousands. */
  grouped: boolean;
  /** Whether the value is a proportion the format scales by a hundred. */
  percent: boolean;
  /** Whether a negative is written in parentheses rather than with a sign. */
  parenthesised: boolean;
  /** What zero is written as, when the format says something other than a number. */
  zeroLiteral: string | null;
}

const PLAIN: NumberShape = {
  decimals: 2,
  grouped: true,
  percent: false,
  parenthesised: false,
  zeroLiteral: null,
};

/**
 * Split a format into its sections: positive, negative, zero, text.
 *
 * Semicolons inside a quoted literal or escaped with a backslash are part of the
 * section, not a separator — `_(* "-"??_)` is one section containing a quoted
 * dash, and splitting it naively produces two broken ones.
 */
function sections(format: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < format.length; index += 1) {
    // `charAt` rather than indexing: this walks to `length`, so indexing gives
    // `string | undefined` at every step and the whole loop needs guarding for a
    // case that cannot happen.
    const char = format.charAt(index);
    if (char === '\\') {
      // An escaped character is two characters of one literal. Taking them
      // together is what stops an escaped semicolon splitting the section.
      current += char + format.charAt(index + 1);
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }
    if (char === ';' && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

/**
 * Strip the parts of a section that are decoration rather than number pattern.
 *
 * The escapes have to survive this. A quoted literal, an `_x` alignment code, a
 * `*x` fill code and a `[Red]` colour code are all things a reader sees rather
 * than digits, and every one of them can carry a comma or a full stop that would
 * otherwise read as grouping or as a decimal point. But `\(` is a literal bracket
 * the format wants printed, and it is the only thing distinguishing an accounting
 * negative from an accounting positive — both of which open with `_(`.
 */
function stripDecoration(section: string): string {
  return section
    .replace(/"[^"]*"/g, '')
    .replace(/[_*]./g, '')
    .replace(/\[[^\]]*\]/g, '');
}

/**
 * What a section says a number should look like.
 *
 * `null` for a section that holds no number pattern at all — the accounting
 * zero section `_(* "-"??_)` is a literal dash, and the caller renders that
 * rather than a formatted zero.
 */
function shapeOf(section: string): NumberShape | null {
  const stripped = stripDecoration(section);
  const bare = stripped.replace(/\\./g, '');

  // `0` and `#` are digits. `?` is not: it reserves the *space* a digit would
  // take, which is how an accounting zero section lines its dash up under the
  // figures above it. A section holding only `?` renders no number at all, and
  // reading one as a number is what buried the dash on every empty accounting row.
  if (!/[0#]/.test(bare)) {
    const literal = /"([^"]*)"/.exec(section);
    return literal ? { ...PLAIN, decimals: 0, zeroLiteral: literal[1] ?? '' } : null;
  }

  const [whole = '', fraction] = bare.split('.');
  return {
    decimals: fraction ? (fraction.match(/[0#?]/g) ?? []).length : 0,
    // A comma between placeholders groups; a trailing one scales by a thousand,
    // which these workbooks do not use and which is better left ungrouped than
    // silently applied.
    grouped: /[0#?],[0#?]/.test(whole),
    percent: bare.includes('%'),
    // The stripped section, not the raw one: the raw accounting *positive*
    // section opens `_(` as well, and reading that as a bracket would wrap every
    // figure in the column in parentheses.
    parenthesised: stripped.includes('('),
    zeroLiteral: null,
  };
}

/**
 * How a format wants a value of this sign written.
 *
 * Excel's rule: one section applies to everything, two split at zero, three or
 * four give zero its own. Falling back to the positive section is what Excel
 * itself does for a missing one.
 */
export function numberShape(format: string | null | undefined, value: number): NumberShape {
  if (!format || format.trim() === GENERAL) {
    return { ...PLAIN, decimals: Number.isInteger(value) ? 0 : 2 };
  }

  const parts = sections(format);
  const index = value < 0 && parts.length > 1 ? 1 : value === 0 && parts.length > 2 ? 2 : 0;
  return shapeOf(parts[index] ?? '') ?? shapeOf(parts[0] ?? '') ?? PLAIN;
}

/**
 * One figure, written the way its column is written in the workbook.
 *
 * Takes the value as the string the API sent. These are `Decimal` on the server
 * and some of them carry twenty significant figures, so parsing to a JavaScript
 * number loses precision — but only ever below the decimal place the format asks
 * for, which is the one place it cannot matter. What must not happen is the
 * rounding being invented here: the column says two places because the preparer
 * said two places.
 */
export function formatExcel(value: string | null | undefined, format?: string | null): string {
  if (value === null || value === undefined || value === '') return '-';

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;

  const shape = numberShape(format, parsed);
  if (parsed === 0 && shape.zeroLiteral !== null) return shape.zeroLiteral || '-';

  const scaled = shape.percent ? parsed * 100 : parsed;
  const magnitude = formatNumber(Math.abs(scaled), {
    minimumFractionDigits: shape.decimals,
    maximumFractionDigits: shape.decimals,
    useGrouping: shape.grouped,
  });

  const suffix = shape.percent ? '%' : '';
  if (scaled < 0) {
    return shape.parenthesised ? `(${magnitude}${suffix})` : `-${magnitude}${suffix}`;
  }
  return `${magnitude}${suffix}`;
}

/**
 * A variance, written to whatever precision it actually needs.
 *
 * Column formatting is wrong for these. A re-add against a stated total differs
 * by floating-point dust — `-4E-8` on one of the sample workbooks — and the
 * column's two decimal places render that as `0.00`, which reads as a variance
 * of nothing beside a badge saying it agrees. Either the number is worth showing
 * or it is not, and showing it rounded away is the one option that misleads.
 */
export function formatVariance(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  if (parsed === 0) return '0.00';

  // Anything a reader would recognise as money is written as money; dust is
  // written in exponent form rather than as a row of zeros.
  if (Math.abs(parsed) < 0.005) return parsed.toExponential(2);
  return formatNumber(parsed, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A share of a component, to one decimal place. The format strings never cover these. */
export function formatShare(share: number | undefined): string {
  if (share === undefined || !Number.isFinite(share)) return '-';
  return `${formatNumber(share * 100, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}
