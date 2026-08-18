import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the IDE.
 *
 * WHY two webServers: the IDE is only meaningful with its backend up — the file tree, the PTY and
 * the collaboration socket all live there. Playwright boots both and reuses an already-running
 * pair locally so a dev with `npm run dev` open does not get a port clash.
 *
 * Run headed with:  npx playwright test --headed
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  // The terminal tests wait on a real shell starting and on `npm`/`python` runs.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // A shared backend + one MongoDB project per run: parallel workers would fight over the same
  // file tree and the same PTY sessions.
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    storageState: './e2e/.auth/state.json',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } },
    },
  ],
  webServer: [
    {
      command: 'npm start',
      cwd: '../backend',
      url: 'http://localhost:5000/health',
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
