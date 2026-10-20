import { setupServer } from 'msw/node';

import { handlers } from '@/testing/mocks/handlers';

/** MSW server for Vitest. Lifecycle is managed in `src/testing/setup.ts`. */
export const server = setupServer(...handlers);
