import { useEffect, useState } from 'react';

const SECOND = 1_000;

/**
 * How far ahead of this browser the server's clock may run before its
 * timestamp is treated as unusable.
 *
 * A start in the future is not a start: `now - start` is negative, and a
 * clamped negative is a clock frozen at zero for the whole review. Two
 * seconds is wide enough for ordinary skew between a container and a laptop
 * and narrow enough that a genuinely mis-parsed timestamp is caught.
 */
const SKEW_TOLERANCE_MS = 2 * SECOND;

/** ISO 8601 carrying no zone — `2026-10-22T09:14:03.512`, or with a space. */
const OFFSETLESS_ISO = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

/**
 * A server timestamp as milliseconds, or `null` where there is no reading it.
 *
 * The one thing this does that `new Date(value)` does not: an ISO string with
 * no offset is read as **UTC**, not as local time. `datetime.utcnow().isoformat()`
 * — still the most common way a Python service stamps a record — produces
 * exactly that string, and `new Date` reads it as local. For a reviewer five
 * and a half hours east of UTC that puts the start of their review five and a
 * half hours into the future, and every elapsed figure derived from it is
 * negative. Clamped, the clock then reads `0.0s` and never moves, which is
 * the symptom this exists to prevent.
 */
export function parseTimestamp(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const text = value.trim();
  const ms = new Date(OFFSETLESS_ISO.test(text) ? `${text}Z` : text).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Milliseconds since `startedAt`, advancing once a second while `active`.
 *
 * Three things it is careful about, each of which has its own way of leaving
 * a reviewer staring at a clock that is lying to them:
 *
 *  - **The origin.** A timestamp that cannot be read, or that lands in the
 *    future because the two clocks disagree, falls back to the moment this
 *    browser started watching. That under-reports a review already in flight,
 *    which is a smaller lie than `0:00` held for two minutes — and the
 *    seconds still move, which is how the reader knows the page is alive.
 *  - **The tick.** Scheduled to land on the next whole second *of the elapsed
 *    value*, re-measured every time, rather than on a free-running interval.
 *    An interval drifts against the value it displays and, under load, skips
 *    a second outright; this cannot, because each tick is timed from the
 *    clock it just read.
 *  - **The gap.** A background tab has its timers throttled hard and a
 *    sleeping machine stops them altogether, so the value is re-read the
 *    moment the tab is visible again instead of resuming where it left off.
 *
 * The timer is torn down as soon as the work finishes, which is what stops a
 * completed review holding one open for as long as the tab is.
 */
export function useElapsed(startedAt: string | number | Date | null, active: boolean): number {
  // The first render of this component, as the fallback origin. Lazy state
  // rather than a ref so nothing is written during render.
  const [watchedFrom] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  const parsed = parseTimestamp(startedAt);
  const origin =
    startedAt === null || startedAt === ''
      ? null
      : parsed === null || parsed > watchedFrom + SKEW_TOLERANCE_MS
        ? watchedFrom
        : parsed;

  useEffect(() => {
    if (!active || origin === null) return;

    let timer = 0;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      // Land on the instant the displayed second actually changes. The floor
      // keeps a pathological clock from scheduling a zero-delay loop.
      const untilNextSecond = SECOND - ((current - origin) % SECOND);
      timer = window.setTimeout(tick, Math.max(untilNextSecond, 16));
    };

    // Immediately, not a second from now: `active` may have just turned on.
    tick();

    const resync = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(timer);
      tick();
    };

    document.addEventListener('visibilitychange', resync);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', resync);
    };
  }, [active, origin]);

  if (origin === null) return 0;
  return Math.max(0, now - origin);
}

/**
 * A running clock: `0:07`, `1:13`, `1:02:05`.
 *
 * Seconds are whole and always two digits, so the only thing that moves is
 * the thing that should be moving. `formatDuration` below reports tenths,
 * which is right for a step that took 340ms and wrong for a clock — a tenths
 * digit updated once a second reads as a stuck display rather than a precise
 * one.
 */
export function formatElapsed(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / SECOND) : 0;

  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${String(hours)}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** `1m 04s` past a minute, `12.4s` below it. Never a bare millisecond count. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0.0s';

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes)}m ${String(seconds).padStart(2, '0')}s`;
}
