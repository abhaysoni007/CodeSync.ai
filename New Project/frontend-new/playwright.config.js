import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration supporting Yjs CRDT Collaboration, Version Control and IDE test suites.
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['**/e2e/**/*.spec.js', '**/tests/**/*.spec.js'],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : 'chrome',
        viewport: { width: 1600, height: 900 }
      },
    },
  ],
  webServer: [
    {
      command: 'npm start',
      cwd: '../backend',
      url: 'http://localhost:5000/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
