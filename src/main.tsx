import '@/styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { env } from '@/config/env';

/**
 * Entry point. Keep this file boring: its only jobs are starting the optional
 * mock server, finding the root node, and mounting the app.
 */
async function startMockServiceWorker(): Promise<void> {
  // Comparing the literal `import.meta.env.MODE` is what keeps MSW (~390 kB)
  // out of a production build: Vite inlines it, so this folds to a constant
  // false and the bundler drops the dynamic import with it. Reading
  // `env.mode` instead would defeat that, because it is only known at runtime.
  if (import.meta.env.MODE === 'production') return;
  if (!env.VITE_ENABLE_API_MOCKING) return;

  const { worker } = await import('@/testing/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root not found in index.html.');
}

void startMockServiceWorker().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
