import { Outlet } from 'react-router';

import { env } from '@/config/env';

/** Centred, chrome-free shell for sign-in and other unauthenticated screens. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{env.VITE_APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
