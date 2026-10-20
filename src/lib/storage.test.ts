import { afterEach, describe, expect, it, vi } from 'vitest';

import { localStore } from '@/lib/storage';

/**
 * The point of this wrapper is that it never throws. Storage access throws in
 * private-mode Safari and when a user blocks site data, and `JSON.parse`
 * throws on a corrupted value — none of which should be able to break a
 * render, so each of those paths is asserted here.
 */
afterEach(() => {
  window.localStorage.clear();
});

describe('localStore', () => {
  it('round-trips a value', () => {
    localStore.set('k', { a: 1 });

    expect(localStore.get('k', null)).toEqual({ a: 1 });
  });

  it('returns the fallback for a missing key', () => {
    expect(localStore.get('absent', 'fallback')).toBe('fallback');
  });

  it('returns the fallback rather than throwing on a corrupted value', () => {
    window.localStorage.setItem('broken', '{not json');

    expect(localStore.get('broken', 'fallback')).toBe('fallback');
  });

  it('returns the fallback when storage access itself throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });

    expect(localStore.get('k', 'fallback')).toBe('fallback');
  });

  it('swallows a write failure instead of propagating it', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => {
      localStore.set('k', 'v');
    }).not.toThrow();
  });

  it('removes a key', () => {
    localStore.set('k', 'v');
    localStore.remove('k');

    expect(localStore.get('k', null)).toBeNull();
  });
});
