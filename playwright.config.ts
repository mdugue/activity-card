import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const STRAVA_MOCK_PORT = 3101;
const STRAVA_MOCK_BASE = `http://localhost:${STRAVA_MOCK_PORT}`;

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
  webServer: [
    {
      // Strava API mock. Boots first so the Next.js server can talk to it
      // during route-handler requests. The mock is stateless — no per-test
      // reset needed, all tests pull the same fixture activities.
      command: "bun e2e/strava-mock.ts",
      url: `${STRAVA_MOCK_BASE}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        STRAVA_MOCK_PORT: String(STRAVA_MOCK_PORT),
      },
    },
    {
      command: `bun run build && bun run start -- --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        // Fake creds — the mock doesn't validate them, but the route
        // handlers refuse to start the flow without them set.
        STRAVA_CLIENT_ID: "mock-client-id",
        STRAVA_CLIENT_SECRET: "mock-client-secret",
        STRAVA_REDIRECT_URI: `http://localhost:${PORT}/api/strava/callback`,
        STRAVA_OAUTH_URL: `${STRAVA_MOCK_BASE}/oauth/authorize`,
        STRAVA_TOKEN_URL: `${STRAVA_MOCK_BASE}/oauth/token`,
        STRAVA_API_BASE: `${STRAVA_MOCK_BASE}/api/v3`,
        // Tests run over plain http; without this opt-out the Secure
        // cookie flag would prevent any Strava cookie from being set.
        STRAVA_INSECURE_COOKIES: "1",
      },
    },
  ],
});
