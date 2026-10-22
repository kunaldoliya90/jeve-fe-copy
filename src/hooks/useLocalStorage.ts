import { useCallback, useEffect, useState } from 'react';

import { localStore } from '@/lib/storage';

/**
 * `useState` that persists to localStorage and stays in sync across tabs.
 *
 * The `storage` listener is the reason to prefer this over a plain
 * `useState` + write: without it, two open tabs drift apart silently.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => localStore.get(key, initialValue));

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? (next as (c: T) => T)(current) : next;
        localStore.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  const remove = useCallback(() => {
    localStore.remove(key);
    setValue(initialValue);
  }, [key, initialValue]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      setValue(localStore.get(key, initialValue));
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [key, initialValue]);

  return [value, set, remove] as const;
}
