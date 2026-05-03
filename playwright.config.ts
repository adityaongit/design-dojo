import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the DesignDojo e2e suite.
 *
 * - Tests assume a dev server on localhost:3000. We don't auto-start one
 *   here because the user typically already has `pnpm dev` running; if not,
 *   set START_SERVER=1 and Playwright will boot it.
 * - All LLM calls (`/api/grade`, `/api/chat`) are intercepted in tests.
 *   See e2e/fixtures.ts.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.START_SERVER
    ? {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
