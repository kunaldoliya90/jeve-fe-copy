import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatElapsed, parseTimestamp, useElapsed } from '@/hooks/useElapsed';

/** A fixed "now" so every assertion below is about the hook, not the clock. */
const NOW = new Date('2026-10-22T09:00:00Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseTimestamp', () => {
  it('reads an offsetless ISO stamp as UTC, not as local time', () => {
    // The whole point: `new Date('2026-10-22T08:59:30')` is local, which puts
    // the start hours away from where the server meant it. Python's
    // `datetime.utcnow().isoformat()` produces exactly this string.
    expect(parseTimestamp('2026-10-22T08:59:30')).toBe(NOW - 30_000);
    expect(parseTimestamp('2026-10-22T08:59:30.250')).toBe(NOW - 29_750);
    expect(parseTimestamp('2026-10-22 08:59:30')).toBe(NOW - 30_000);
  });

  it('leaves a stamp that carries its own offset alone', () => {
    expect(parseTimestamp('2026-10-22T08:59:30Z')).toBe(NOW - 30_000);
    expect(parseTimestamp('2026-10-22T09:59:30+01:00')).toBe(NOW - 30_000);
  });

  it('returns null for nothing to read', () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('not a date')).toBeNull();
  });
});

describe('useElapsed', () => {
  it('counts from the start and advances once a second', () => {
    const { result } = renderHook(() => useElapsed('2026-10-22T08:59:55Z', true));

    expect(result.current).toBe(5_000);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(6_000);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(result.current).toBe(9_000);
  });

  it('keeps ticking well past the first minute', () => {
    const { result } = renderHook(() => useElapsed('2026-10-22T08:59:00Z', true));

    act(() => {
      vi.advanceTimersByTime(75_000);
    });

    expect(result.current).toBe(135_000);
  });

  it('counts from first render when the start is in the future', () => {
    // A server clock running ahead, or a timestamp this page could not read.
    // Either way `now - start` is negative, and the clamped result used to be
    // a clock frozen at zero for the whole review.
    const { result } = renderHook(() => useElapsed('2026-10-22T09:05:00Z', true));

    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe(2_000);
  });

  it('counts from first render when the start cannot be read', () => {
    const { result } = renderHook(() => useElapsed('nonsense', true));

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(result.current).toBe(3_000);
  });

  it('reports zero, and starts no timer, with no start at all', () => {
    const { result } = renderHook(() => useElapsed(null, true));

    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops the timer when the work is no longer active', () => {
    const { rerender } = renderHook(({ active }) => useElapsed('2026-10-22T08:59:55Z', active), {
      initialProps: { active: true },
    });

    expect(vi.getTimerCount()).toBe(1);

    rerender({ active: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no timer behind on unmount', () => {
    const { unmount } = renderHook(() => useElapsed('2026-10-22T08:59:55Z', true));

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('always pads the seconds, so only the moving digit moves', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7_400)).toBe('0:07');
    expect(formatElapsed(73_200)).toBe('1:13');
    expect(formatElapsed(599_000)).toBe('9:59');
  });

  it('grows an hours field rather than counting to 600 minutes', () => {
    expect(formatElapsed(3_600_000)).toBe('1:00:00');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
  });

  it('never reports a negative or nonsensical duration', () => {
    expect(formatElapsed(-1)).toBe('0:00');
    expect(formatElapsed(Number.NaN)).toBe('0:00');
  });
});
