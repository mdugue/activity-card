import { expect, test } from "@playwright/test";
import { uploadActivity } from "./helpers";

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

  test("empty state shows Connect Strava as the primary CTA", async ({
    page,
  }) => {
    const connect = page.getByRole("button", { name: /connect strava/i });
    await expect(connect).toBeVisible();
    // Should be focused on mount so Enter activates the OAuth flow without
    // requiring a mouse click — the user's "Strava is first-class" ask.
    await expect(connect).toBeFocused();
  });

  test("OAuth round-trip lands on the picker", async ({ page }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();

    // After the mock approves and the callback exchanges the code, the app
    // redirects to /?strava=connected and auto-opens the picker.
    await page.waitForURL(/\/$/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();
    // The first page should include the named ride at the top.
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
    // (visible preview + off-screen export mount), so .first() is sufficient.
    const marks = page.getByRole("img", { name: /powered by strava/i });
    await expect(marks.first()).toBeVisible();
  });

  test("uploaded files do NOT show the Strava attribution", async ({
    page,
  }) => {
    await uploadActivity(page);

    const marks = page.getByRole("img", { name: /powered by strava/i });
    await expect(marks).toHaveCount(0);
  });

  test("multi-select combines two activities into a triathlon-shape card", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    // Flip multi-select on, pick two named activities (Ride + Run).
    await page.getByRole("switch", { name: /multi-select/i }).click();
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await page.getByRole("button", { name: /föhrer westwind/i }).click();

    // Sticky bottom CTA appears once 2 are selected.
    const combine = page.getByRole("button", {
      name: /^combine 2 activities$/i,
    });
    await expect(combine).toBeEnabled();
    await combine.click();

    // Editor opens — assembled triathlon by `assembleTriathlon`.
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();
    // FileLoadedRow indicates a combined Strava activity.
    await expect(
      page.getByText(/Strava · 2 activities combined/i)
    ).toBeVisible();
  });

  test("pagination renders page numbers and advances", async ({ page }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    // The mock has 53 fixture activities (all ride/run/swim), per_page is
    // 30 → ceil(53/30) === 2 pages. The list should render "1" and "2" as
    // individual page links with "1" active.
    const pagination = page.locator("nav[aria-label='pagination']");
    const page1 = pagination.getByRole("button", { name: /^1$/ });
    const page2 = pagination.getByRole("button", { name: /^2$/ });
    await expect(page1).toBeVisible();
    await expect(page2).toBeVisible();
    await expect(page1).toHaveAttribute("aria-current", "page");

    // Page 1: named ride is in this slice.
    await expect(
      page.getByRole("button", { name: /saturday in the elbsandstein/i })
    ).toBeVisible();

    // Click the "2" link directly to jump pages.
    await page2.click();

    // Synthesised activities start at id 2000 — the first Page-2 item is "Mock Ride #28".
    await expect(
      page.getByRole("button", { name: /mock ride #28/i })
    ).toBeVisible();
    await expect(page2).toHaveAttribute("aria-current", "page");
    // Named first-page activity is no longer in the DOM.
    await expect(
      page.getByRole("button", { name: /saturday in the elbsandstein/i })
    ).toHaveCount(0);
  });

  test("multi-select shows sport icons + checkboxes; clicking the row toggles", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    await page.getByRole("switch", { name: /multi-select/i }).click();

    const row = page.getByRole("button", {
      name: /saturday in the elbsandstein/i,
    });
    // Sport icon (lucide Bike, tagged with data-sport for the test) is
    // still in the row in multi mode — alongside the checkbox, not
    // replaced by it.
    await expect(row.locator('[data-sport="ride"]')).toBeVisible();

    // The checkbox itself is non-interactive — clicking the row (anywhere,
    // including where the checkbox visually sits) toggles selection
    // exactly once. Click → selected, click again → deselected.
    await row.click();
    await expect(page.getByText(/1 selected/i)).toBeVisible();
    await row.click();
    await expect(page.getByText(/0 selected/i)).toBeVisible();
  });

  test("Swap on a Strava activity reopens the picker, not the file dialog", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /connect strava/i }).click();
    await page.waitForURL(/\/$/);
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();

    // The file-loaded row reads "Strava · …" and the Swap button takes us
    // back to the picker instead of opening a file dialog.
    await expect(
      page.getByText(/Strava · Saturday in the Elbsandstein/i)
    ).toBeVisible();
    await page.getByRole("button", { name: /^swap$/i }).click();
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();
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

  test("callback ignores a malicious `return_to` and lands on /", async ({
    page,
  }) => {
    // Drive the OAuth flow manually so we can inject a `return_to` that
    // points off-origin. A correctly-hardened callback redirects to the
    // safe default instead of the attacker's URL.
    await page.goto(
      "/api/strava/authorize?return_to=https%3A%2F%2Fattacker.example%2Fphish"
    );
    // After the mock approves + callback exchanges, we should land on /,
    // NOT on the attacker host. waitForURL throws if the URL is wrong.
    await page.waitForURL(/^http:\/\/localhost:3100\/(\?.*)?$/, {
      timeout: 10_000,
    });
    // The picker opens because the flow still completes; the only thing
    // the attacker controls (the post-auth destination) was overridden.
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();
  });

  test("502 from Strava on a picked activity surfaces an inline error", async ({
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
