import { describe, expect, it } from 'vitest';

import { formatExcel, formatShare, formatVariance } from './excelFormat';

/**
 * The accounting mask these workbooks actually carry, verbatim.
 *
 * `String.raw` so the backslashes are the ones Excel wrote. In an ordinary
 * literal `'\('` is just `'('`, which quietly tests a format no workbook
 * contains — and the escaped bracket is the only thing that distinguishes an
 * accounting negative section from an accounting positive one.
 */
const ACCOUNTING = String.raw`_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)`;

describe('formatExcel', () => {
  it('writes a number to the decimal places its column asks for', () => {
    expect(formatExcel('27839758.1234', '#,##0.00')).toBe('27,839,758.12');
  });

  it('groups thousands only when the pattern groups them', () => {
    expect(formatExcel('2500', '0.00')).toBe('2500.00');
    expect(formatExcel('2500', '#,##0.00')).toBe('2,500.00');
  });

  it('writes a negative in parentheses when the accounting mask says to', () => {
    expect(formatExcel('-1250.5', ACCOUNTING)).toBe('(1,250.50)');
  });

  it('writes zero as the dash the accounting mask gives it', () => {
    // The literal is what makes an accounting column of mostly-empty rows
    // readable; rendering `0.00` down forty rows buries the ones that matter.
    expect(formatExcel('0', ACCOUNTING)).toBe('-');
  });

  it('keeps a plain zero plain where the format gives it no literal', () => {
    expect(formatExcel('0', '#,##0.00')).toBe('0.00');
  });

  it('scales a proportion the format writes as a percentage', () => {
    expect(formatExcel('0.9976', '0.0%')).toBe('99.8%');
  });

  it('leaves a whole number whole on Excel default formatting', () => {
    expect(formatExcel('1073', 'General')).toBe('1,073');
    expect(formatExcel('1073', null)).toBe('1,073');
  });

  it('does not split a section on a semicolon inside a quoted literal', () => {
    // A naive split produces a broken pattern and silently loses the decimals.
    expect(formatExcel('-5', String.raw`#,##0.00;[Red]\(#,##0.00\)`)).toBe('(5.00)');
  });

  it('falls back to a readable figure on a format it does not understand', () => {
    expect(formatExcel('1234.5', '[$-409]d/mmm/yy;@')).toBe('1,234.50');
  });

  it('says so rather than inventing a zero when there is no value', () => {
    expect(formatExcel(null, ACCOUNTING)).toBe('-');
    expect(formatExcel('', ACCOUNTING)).toBe('-');
  });

  it('passes a value it cannot parse through untouched', () => {
    expect(formatExcel('#N/A', ACCOUNTING)).toBe('#N/A');
  });
});

describe('formatVariance', () => {
  it('writes floating-point dust in exponent form rather than as a row of zeros', () => {
    // `0.00` beside a badge saying the total agrees reads as a variance of
    // nothing. It is not nothing; it is below the agreed tolerance.
    expect(formatVariance('-4E-8')).toBe('-4.00e-8');
  });

  it('writes a variance a reader would act on as money', () => {
    expect(formatVariance('-27905812.64')).toBe('-27,905,812.64');
  });

  it('writes an exact tie as an exact zero', () => {
    expect(formatVariance('0.00')).toBe('0.00');
  });
});

describe('formatShare', () => {
  it('writes a share to one decimal place', () => {
    expect(formatShare(0.9976)).toBe('99.8%');
    expect(formatShare(0.0024)).toBe('0.2%');
  });

  it('says so when there is no share to write', () => {
    expect(formatShare(undefined)).toBe('-');
  });
});
