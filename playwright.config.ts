import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const STRAVA_MOCK_PORT = 3101;
const STRAVA_MOCK_BASE = `http://localhost:${STRAVA_MOCK_PORT}`;
/** CI sets `CI` to a non-empty value; unset or empty means a local run. */
const IS_CI = process.env.CI !== undefined && process.env.CI !== "";

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
  forbidOnly: IS_CI,
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: IS_CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  retries: IS_CI ? 2 : 0,
  testDir: "./e2e",
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      // Strava API mock. Boots first so the Next.js server can talk to it
      // during route-handler requests. The mock is stateless — no per-test
      // reset needed, all tests pull the same fixture activities.
      command: "bun e2e/strava-mock.ts",
      env: {
        STRAVA_MOCK_PORT: String(STRAVA_MOCK_PORT),
      },
      reuseExistingServer: !IS_CI,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 30_000,
      url: `${STRAVA_MOCK_BASE}/health`,
    },
    {
      command: `bun run build && bun run start -- --port ${PORT}`,
      env: {
        // Fake creds — the mock doesn't validate them, but the route
        // handlers refuse to start the flow without them set.
        // Puts http://127.0.0.1 on the bounce allowlist, so the bounce test
        // proves an unsigned target is refused even when its host passes.
        STRAVA_ALLOW_HTTP_BOUNCE: "1",
        STRAVA_API_BASE: `${STRAVA_MOCK_BASE}/api/v3`,
        STRAVA_CLIENT_ID: "mock-client-id",
        STRAVA_CLIENT_SECRET: "mock-client-secret",
        // Tests run over plain http; without this opt-out the Secure
        // cookie flag would prevent any Strava cookie from being set.
        STRAVA_INSECURE_COOKIES: "1",
        STRAVA_OAUTH_URL: `${STRAVA_MOCK_BASE}/oauth/authorize`,
        STRAVA_REDIRECT_URI: `http://localhost:${PORT}/api/strava/callback`,
        STRAVA_TOKEN_URL: `${STRAVA_MOCK_BASE}/oauth/token`,
      },
      reuseExistingServer: !IS_CI,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 180_000,
      url: `http://localhost:${PORT}`,
    },
  ],
  workers: IS_CI ? 2 : undefined,
});
