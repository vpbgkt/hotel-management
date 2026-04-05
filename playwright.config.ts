import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Hotel Manager
 * 
 * Runs against local dev servers:
 *   - Frontend (Next.js): http://localhost:3000
 *   - API (NestJS):       http://localhost:4000
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  
  /* Run tests in parallel */
  fullyParallel: true,
  
  /* Fail the build on test.only in CI */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Use 1 worker in CI for stability */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: process.env.CI 
    ? [['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'on-failure' }]],
  
  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:3000',
    
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Default timeout */
    actionTimeout: 10000,
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start dev servers before running E2E tests */
  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
