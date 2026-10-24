import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root and server environment variables if available
const rootEnv = path.resolve(__dirname, '.env');
const serverEnv = path.resolve(__dirname, 'server', '.env');

if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(rootEnv); } catch (_) {}
}
if (fs.existsSync(serverEnv) && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(serverEnv); } catch (_) {}
}

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';

export default defineConfig({
  testDir: './tests',
  /* Only look for *.spec.ts files so Playwright does not try running node --test .mjs files */
  testMatch: /.*\.spec\.ts/,
  /* Run tests in files predictably */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI */
  workers: 1,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  /* Shared settings for all the projects below */
  use: {
    baseURL: BASE_URL,
    /* Collect trace on failure */
    trace: 'retain-on-failure',
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    /* Retain video on failure */
    video: 'retain-on-failure',
    /* Generous navigation and action timeouts */
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },

  /* Configure projects for major browsers and mobile viewports */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run local backend (which serves built frontend + APIs) before starting tests */
  webServer: {
    command: 'node server/server.js',
    url: 'http://localhost:5000/api/health',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
