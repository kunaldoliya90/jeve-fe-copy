/* eslint-disable react-refresh/only-export-components */
import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { createQueryClient } from '@/lib/query/queryClient';

export interface RenderWithProvidersOptions {
  /** Initial URL for the in-memory router. */
  route?: string;
  /** Route pattern the component is mounted at, when it reads params. */
  path?: string;
}

export interface RenderWithProvidersResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * Render a component with the providers it has in the real app.
 *
 * A fresh QueryClient per test matters: a shared one leaks cached data between
 * tests and produces order-dependent failures. Retries are disabled so an
 * expected error surfaces immediately rather than after three backoffs.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = '*' }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  });

  const router = createMemoryRouter([{ path, element: ui }], { initialEntries: [route] });

  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
