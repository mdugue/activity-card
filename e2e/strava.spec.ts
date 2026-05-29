import { expect, test } from "@playwright/test";

/**
 * E2E coverage for the Strava OAuth + activity-picker flow.
 *
 * The Strava API itself is faked by `e2e/strava-mock.ts` (booted as a second
 * webServer in playwright.config.ts). The Next.js app is pointed at the mock
 * via STRAVA_OAUTH_URL / STRAVA_TOKEN_URL / STRAVA_API_BASE env vars, so the
 * real route handlers run unmodified — these tests cover the actual
 * request/response shape end-to-end, not just the UI.
 */

test.describe("strava OAuth + picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("empty state shows Connect Strava when not connected", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /connect strava/i })
    ).toBeVisible();
  });

  test("OAuth round-trip lands on the picker", async ({ page }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();

    // After the mock approves and the callback exchanges the code, the app
    // redirects to /?strava=connected and auto-opens the picker.
    await page.waitForURL(/\/$/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();
    // The mock returns 3 fixed activities; just check one is visible.
    await expect(
      page.getByRole("button", { name: /saturday in the elbsandstein/i })
    ).toBeVisible();
  });

  test("after connecting, the button label switches to 'Pick from Strava'", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    // Go back to the empty state — the connection cookie should still be set,
    // so the empty state's CTA should now offer the picker directly.
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(
      page.getByRole("button", { name: /pick from strava/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /connect strava/i })
    ).not.toBeVisible();
  });

  test("picking an activity opens the editor with Strava attribution", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);

    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();

    // Editor state: theme picker is the canonical signal.
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();

    // Connection-status row inside the controls pane.
    await expect(page.getByText(/STRAVA · ALEX/i)).toBeVisible();

    // The card itself (PATH theme is default) carries the "Powered by Strava"
    // attribution because source === 'strava'. Cards are rendered twice
    // (visible preview + off-screen export mount), so two marks is fine.
    const marks = page.getByRole("img", { name: /powered by strava/i });
    await expect(marks.first()).toBeVisible();
  });

  test("uploaded files do NOT show the Strava attribution", async ({
    page,
  }) => {
    // Sample data is shipped as `source: undefined` (treated as upload).
    await page.getByRole("button", { name: /try a sample/i }).click();
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();

    const marks = page.getByRole("img", { name: /powered by strava/i });
    await expect(marks).toHaveCount(0);
  });

  test("disconnect clears the connection state", async ({ page }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();

    await page.getByRole("button", { name: /^disconnect$/i }).click();

    // Re-open the empty state — the CTA should be back to "Connect".
    await page.reload();
    await expect(
      page.getByRole("button", { name: /connect strava/i })
    ).toBeVisible();
  });

  test("404 from Strava on a picked activity surfaces an inline error", async ({
    page,
  }) => {
    // Manually open the picker route, then force the detail endpoint to fail
    // by hijacking the request at the browser level. The list endpoint is
    // untouched, so the picker still renders.
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    await page.route("**/api/strava/activity/*", (route) =>
      route.fulfill({ status: 502, body: "upstream broke" })
    );
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await expect(page.getByText(/strava returned 502/i)).toBeVisible();
  });
});
