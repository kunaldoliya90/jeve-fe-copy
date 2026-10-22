import { env } from '@/config/env';

/**
 * The single logging seam in the app.
 *
 * ESLint bans bare `console.*` so that log level is configurable per
 * environment and so there is one place to wire up a remote sink (Sentry,
 * Datadog, App Insights) without touching call sites.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const threshold = LEVEL_WEIGHT[env.VITE_LOG_LEVEL];

const enabled = (level: Exclude<LogLevel, 'silent'>) => LEVEL_WEIGHT[level] >= threshold;

/* eslint-disable no-console */
export const logger = {
  debug(message: string, ...context: unknown[]) {
    if (enabled('debug')) console.debug(`[debug] ${message}`, ...context);
  },

  info(message: string, ...context: unknown[]) {
    if (enabled('info')) console.info(`[info] ${message}`, ...context);
  },

  warn(message: string, ...context: unknown[]) {
    if (enabled('warn')) console.warn(`[warn] ${message}`, ...context);
  },

  /**
   * Report an unexpected failure. This is the hook to extend when a crash
   * reporter is added — forward `error` here and nothing else changes.
   */
  error(message: string, error?: unknown, ...context: unknown[]) {
    if (enabled('error')) console.error(`[error] ${message}`, error, ...context);
  },
};
/* eslint-enable no-console */
