import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Effort E2E config.
 *
 * - Single browser (Chromium) for desktop; we test mobile via a viewport
 *   override inside the relevant spec, not a separate project.
 * - `webServer` builds + starts the production server. We run E2E against the
 *   production build (not dev) so the tests catch issues that turbopack's dev
 *   mode hides — e.g. server/client boundary problems, hydration mismatches.
 * - Traces / screenshots / videos are retained only on failure so the CI
 *   artifact stays small but a failed run gives a reviewer something to look
 *   at without re-running locally.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `bun run build && bun run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
