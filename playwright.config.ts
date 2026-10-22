import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = process.env['E2E_BASE_URL'] ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './test-results',
  fullyParallel: true,

  // A committed `test.only` would silently shrink the CI suite.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // One worker on CI: parallel browsers starve a 2-core runner and
  // produce flaky timeouts rather than real failures.
  ...(isCI ? { workers: 1 } : {}),

  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],

  // Build + preview rather than dev, so the suite exercises a real bundle.
  // The `e2e` mode loads .env.e2e, which turns on the MSW mock backend — the
  // production mode deliberately cannot, so MSW never ships.
  webServer: {
    command: 'npm run build:e2e && npm run preview',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
