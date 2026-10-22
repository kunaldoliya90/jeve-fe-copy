import { Outlet } from 'react-router';

import { Card } from '@/components/ui';
import { env } from '@/config/env';

/** Centred, chrome-free shell for sign-in and other unauthenticated screens. */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* A single slow wash behind the card. Fixed and non-interactive, and
          animating transform only, so it costs the compositor and nothing else. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 animate-drift rounded-full bg-primary/[0.08] blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-rise">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground-strong">
            {env.VITE_APP_NAME}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <Card elevation="float" className="hairline-top p-6">
          <Outlet />
        </Card>
      </div>
    </div>
  );
}
