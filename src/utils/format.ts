/**
 * Formatting helpers. `Intl` formatters are expensive to construct, so they
 * are memoised per locale/options rather than rebuilt on every render.
 */
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

const DEFAULT_LOCALE = 'en-US';

function numberFormatter(options: Intl.NumberFormatOptions, locale: string): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

function dateFormatter(options: Intl.DateTimeFormatOptions, locale: string): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale = DEFAULT_LOCALE,
): string {
  return numberFormatter(options, locale).format(value);
}

export function formatCurrency(value: number, currency = 'USD', locale = DEFAULT_LOCALE): string {
  return formatNumber(value, { style: 'currency', currency }, locale);
}

/** Returns an empty string for unparseable input rather than "Invalid Date". */
export function formatDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale = DEFAULT_LOCALE,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter(options, locale).format(date);
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
