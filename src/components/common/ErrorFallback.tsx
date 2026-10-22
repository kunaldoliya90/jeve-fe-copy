import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
    <Card
      role="alert"
      elevation="float"
      className="mx-auto flex max-w-md animate-rise flex-col items-center gap-4 p-8 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-pill bg-danger/10">
        <AlertTriangle className="size-6 text-danger" aria-hidden="true" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground-strong">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{toUserMessage(error)}</p>
      </div>

      {env.isDev ? (
        <pre className="max-h-40 w-full overflow-auto rounded-md bg-surface-muted p-3 text-left text-xs text-muted-foreground">
          {error.stack ?? error.message}
        </pre>
      ) : null}

      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </Card>
  );
}
