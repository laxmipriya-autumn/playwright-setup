// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,        // ← change: avoid session conflicts
  forbidOnly: !!process.env.CI,
  retries: 1,                  // ← change: retry once on failure
  workers: 1,                  // ← change: run one at a time
  reporter: 'html',
  timeout: 60000,              // ← add: global 60s timeout

  use: {
    headless: false,           // ← add: see browser while testing
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Keep firefox & webkit commented until chromium works
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});