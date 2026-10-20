import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { env } from '@/config/env';
import { toUserMessage } from '@/lib/http/errors';

export interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
  title?: string | undefined;
}

/**
 * Default presentation for a caught error. Shows a user-safe message in every
 * environment and the raw error only in development, so production never
 * leaks internals onto the screen.
 */
export function ErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center"
    >
      <AlertTriangle className="size-8 text-danger" aria-hidden="true" />

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{toUserMessage(error)}</p>
      </div>

      {env.isDev ? (
        <pre className="max-h-40 w-full overflow-auto rounded-md bg-surface-muted p-3 text-left text-xs text-muted-foreground">
          {error.stack ?? error.message}
        </pre>
      ) : null}

      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
