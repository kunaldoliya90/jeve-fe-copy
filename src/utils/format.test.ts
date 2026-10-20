import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDate, truncate } from '@/utils/format';

describe('formatCurrency', () => {
  it('formats with the currency symbol', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });
});

describe('formatDate', () => {
  it('formats a valid date', () => {
    expect(formatDate('2026-03-14T00:00:00Z', { dateStyle: 'short', timeZone: 'UTC' })).toBe(
      '3/14/26',
    );
  });

  it('returns an empty string rather than "Invalid Date"', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('adds an ellipsis when cutting', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});
