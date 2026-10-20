import { logger } from '@/lib/logger';

/**
 * Typed, fail-soft wrapper over Web Storage.
 *
 * Direct `localStorage` access throws in private-mode Safari and when a user
 * blocks site data, and `JSON.parse` throws on corrupted values. Neither
 * should be able to take down a render, so every operation degrades to a
 * fallback instead.
 */
function createStorage(getBackend: () => Storage) {
  return {
    get<T>(key: string, fallback: T): T {
      try {
        const raw = getBackend().getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch (error) {
        logger.warn(`Could not read "${key}" from storage; using fallback.`, error);
        return fallback;
      }
    },

    set(key: string, value: unknown): void {
      try {
        getBackend().setItem(key, JSON.stringify(value));
      } catch (error) {
        // Most often a quota error, or storage disabled entirely.
        logger.warn(`Could not write "${key}" to storage.`, error);
      }
    },

    remove(key: string): void {
      try {
        getBackend().removeItem(key);
      } catch (error) {
        logger.warn(`Could not remove "${key}" from storage.`, error);
      }
    },
  };
}

export const localStore = createStorage(() => window.localStorage);
export const sessionStore = createStorage(() => window.sessionStorage);
