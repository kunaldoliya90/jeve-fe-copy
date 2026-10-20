import '@testing-library/jest-dom/vitest';

import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { useAuthStore } from '@/features/auth';
import { resetMockSession } from '@/testing/mocks/handlers';
import { server } from '@/testing/mocks/server';

/*
 * Testing Library's auto-cleanup runs on its own because Vitest globals are
 * enabled (see `test.globals` in vite.config.ts), so no manual `cleanup()`.
 */

// `error` on an unhandled request: a test that hits an unmocked endpoint has a
// hidden dependency and should fail loudly rather than hang.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockSession();
  // Zustand stores are module singletons, so a session set by one test would
  // otherwise leak into the next and make results order-dependent.
  useAuthStore.getState().clearSession();
});

afterAll(() => {
  server.close();
});

// jsdom implements neither of these, and components that use them would throw
// instead of rendering.
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
);
