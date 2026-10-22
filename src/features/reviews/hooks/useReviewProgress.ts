/**
 * Live progress for one review, over Server-Sent Events.
 *
 * `EventSource` rather than a websocket: progress is one-directional, and SSE
 * reconnects by itself. The one thing it does *not* do is stop — a closed
 * stream looks identical to a dropped one, so it retries forever. The review
 * ending is therefore detected from the events themselves, and the connection
 * is closed from this side.
 *
 * Arriving events are buffered and flushed on an animation frame rather than
 * each one setting state on its own. Step 16 emits one event per check, so a
 * typical review delivers eighteen of them inside a millisecond or two; one
 * `setState` each would be eighteen renders of a panel that re-folds the whole
 * stream, where one coalesced flush is a single render with the same result.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/lib/logger';

import { eventsUrl } from '../api/reviews.api';
import type { ProgressEvent, SseEventName } from '../types';

const TERMINAL: readonly SseEventName[] = ['review_completed', 'review_failed'];

const SUBSCRIBED: readonly SseEventName[] = [
  'review_started',
  'step_started',
  'step_finished',
  'cache_hit',
  'ai_call',
  'check_finished',
  'review_completed',
  'review_failed',
];

export interface ReviewProgressStream {
  /** Every event received, oldest first. */
  events: ProgressEvent[];
  /** The most recent event, for the headline line. */
  current: ProgressEvent | null;
  /** True once a terminal event has arrived. */
  finished: boolean;
  /** Set when the connection itself failed, not when the review did. */
  connectionError: boolean;
  /**
   * True while the stream is believed to be delivering.
   *
   * The polled query uses this to back off: with a healthy stream the poll is
   * only a backstop, and hammering a full review detail every two seconds to
   * learn what the stream already said is wasted on both ends.
   */
  streaming: boolean;
}

export function useReviewProgress(reviewId: string | null): ReviewProgressStream {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [finished, setFinished] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [open, setOpen] = useState(false);
  const [trackedId, setTrackedId] = useState(reviewId);

  // Reset during render rather than in an effect. Clearing in an effect would
  // paint one frame of the previous review's progress under the new review's
  // heading before the reset landed.
  if (trackedId !== reviewId) {
    setTrackedId(reviewId);
    setEvents([]);
    setFinished(false);
    setConnectionError(false);
    setOpen(false);
  }

  const buffer = useRef<ProgressEvent[]>([]);
  const frame = useRef<number | null>(null);

  const flush = useCallback(() => {
    frame.current = null;
    if (buffer.current.length === 0) return;
    const batch = buffer.current;
    buffer.current = [];
    setEvents((previous) => [...previous, ...batch]);
  }, []);

  useEffect(() => {
    if (!reviewId) return;

    const source = new EventSource(eventsUrl(reviewId));
    let done = false;

    const schedule = () => {
      frame.current ??= requestAnimationFrame(flush);
    };

    const handle = (name: SseEventName) => (raw: MessageEvent<string>) => {
      let parsed: ProgressEvent;
      try {
        parsed = JSON.parse(raw.data) as ProgressEvent;
      } catch {
        logger.warn('Discarded an unparseable progress event', { name });
        return;
      }

      buffer.current.push(parsed);

      if (TERMINAL.includes(name)) {
        done = true;
        // Straight to state, not via a frame: the final event is what the
        // rest of the page waits on to fetch the report.
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        flush();
        setFinished(true);
        // The server has nothing more to send. Closing here is what stops
        // EventSource reconnecting to a finished review in a loop.
        source.close();
        setOpen(false);
        return;
      }

      schedule();
    };

    const listeners = SUBSCRIBED.map((name) => {
      const listener = handle(name) as EventListener;
      source.addEventListener(name, listener);
      return [name, listener] as const;
    });

    source.onopen = () => {
      setOpen(true);
      // A reconnect that works is no longer a failure to report.
      setConnectionError(false);
    };

    source.onerror = () => {
      // Fires both on a genuine failure and on the normal close after the
      // final event, so a stream that already finished is not an error.
      setOpen(false);
      if (!done) setConnectionError(true);
    };

    return () => {
      for (const [name, listener] of listeners) {
        source.removeEventListener(name, listener);
      }
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      buffer.current = [];
      source.close();
    };
  }, [flush, reviewId]);

  return {
    events,
    current: events.length > 0 ? (events[events.length - 1] ?? null) : null,
    finished,
    connectionError,
    streaming: open && !connectionError && !finished,
  };
}
