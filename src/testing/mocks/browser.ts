import { setupWorker } from 'msw/browser';

import { handlers } from '@/testing/mocks/handlers';

/**
 * MSW worker for the browser, started from `main.tsx` when
 * VITE_ENABLE_API_MOCKING is "true". Lets the UI be built against a contract
 * before the backend exists.
 */
export const worker = setupWorker(...handlers);
