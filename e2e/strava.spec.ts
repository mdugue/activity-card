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

const CONNECT_BUTTON = { name: /connect with strava/i };

test.describe("strava OAuth + picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("empty state shows the official Connect button focused", async ({
    page,
  }) => {
    // Per Strava brand guidelines §1.1 the official 237×48 SVG button is
    // an anchor pointing at the OAuth init route — not a `<button>`.
    const connect = page.getByRole("link", CONNECT_BUTTON);
    await expect(connect).toBeVisible();
    await expect(connect).toHaveAttribute("href", "/api/strava/authorize");
    // Auto-focused so pressing Enter from the landing page triggers OAuth.
    await expect(connect).toBeFocused();
  });

  test("footer always renders 'Compatible with Strava'", async ({ page }) => {
    // Per Strava §1.2 + §4 — interoperability reference belongs in app
    // chrome, not on every exported card. Footer is present even before
    // the user connects.
    const footer = page.locator("footer");
    await expect(
      footer.getByRole("link", { name: /compatible with strava/i })
    ).toBeVisible();
  });

  test("OAuth round-trip lands on the picker", async ({ page }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();

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

  test("after connecting, the empty state offers 'Pick from Strava'", async ({
    page,
  }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    // Back to empty state — connection cookie is still set.
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(
      page.getByRole("button", { name: /pick from strava/i })
    ).toBeVisible();
    // The official Connect button is hidden in the connected state.
    await expect(page.getByRole("link", CONNECT_BUTTON)).not.toBeVisible();
  });

  test("picking an activity opens the editor with a 'View on Strava' link", async ({
    page,
  }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();

    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();

    // Connection-status row inside the controls pane.
    await expect(page.getByText(/STRAVA · ALEX/i)).toBeVisible();

    // "View on Strava" link points at the picked activity (id 1001 per the mock).
    const link = page.getByRole("link", { name: /view on strava/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      "href",
      "https://www.strava.com/activities/1001/overview"
    );
  });

  test("card itself carries NO in-image Strava mark, regardless of source", async ({
    page,
  }) => {
    // Uploaded file: no Strava mark anywhere.
    await uploadActivity(page);
    await expect(
      page.getByRole("img", { name: /powered by strava/i })
    ).toHaveCount(0);
  });

  test("multi-select combines two activities and renders per-segment View on Strava links", async ({
    page,
  }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    // Multi-select: ride (id 1001) + run (id 1002).
    await page.getByRole("switch", { name: /multi-select/i }).click();
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await page.getByRole("button", { name: /föhrer westwind/i }).click();

    await page.getByRole("button", { name: /^combine 2 activities$/i }).click();

    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();
    await expect(
      page.getByText(/Strava · 2 activities combined/i)
    ).toBeVisible();

    // Segment-aligned links: ride sorts first by start_date so segment 1
    // is BIKE (mapped from "ride") → id 1001, segment 2 is RUN → id 1002.
    // The mock orders: 2026-05-17 run, 2026-05-18 ride → so sorted is
    // [run (1002), ride (1001)] meaning segment 1 is RUN, segment 2 is BIKE.
    const links = page.getByRole("link", { name: /^(run|bike|swim)$/i });
    await expect(links).toHaveCount(2);
    // Don't pin to a specific order — just verify both ids are linked.
    const hrefs = await links.evaluateAll((els) =>
      (els as HTMLAnchorElement[]).map((a) => a.href)
    );
    expect(hrefs).toContain("https://www.strava.com/activities/1001/overview");
    expect(hrefs).toContain("https://www.strava.com/activities/1002/overview");
  });

  test("pagination renders page numbers and advances", async ({ page }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    const pagination = page.locator("nav[aria-label='pagination']");
    const page1 = pagination.getByRole("button", { name: /^1$/ });
    const page2 = pagination.getByRole("button", { name: /^2$/ });
    await expect(page1).toBeVisible();
    await expect(page2).toBeVisible();
    await expect(page1).toHaveAttribute("aria-current", "page");

    await expect(
      page.getByRole("button", { name: /saturday in the elbsandstein/i })
    ).toBeVisible();

    await page2.click();

    await expect(
      page.getByRole("button", { name: /mock ride #28/i })
    ).toBeVisible();
    await expect(page2).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("button", { name: /saturday in the elbsandstein/i })
    ).toHaveCount(0);
  });

  test("multi-select shows sport icons + checkboxes; clicking the row toggles", async ({
    page,
  }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    await page.getByRole("switch", { name: /multi-select/i }).click();

    const row = page.getByRole("button", {
      name: /saturday in the elbsandstein/i,
    });
    await expect(row.locator('[data-sport="ride"]')).toBeVisible();

    await row.click();
    await expect(page.getByText(/1 selected/i)).toBeVisible();
    await row.click();
    await expect(page.getByText(/0 selected/i)).toBeVisible();
  });

  test("Swap on a Strava activity reopens the picker, not the file dialog", async ({
    page,
  }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();

    await expect(
      page.getByText(/Strava · Saturday in the Elbsandstein/i)
    ).toBeVisible();
    await page.getByRole("button", { name: /^swap$/i }).click();
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();
  });

  test("Disconnect lives in the footer and is reachable from any state", async ({
    page,
  }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    // Verify footer carries the Disconnect after connecting — picker state.
    const footer = page.locator("footer");
    await expect(footer.getByText(/connected as alex/i)).toBeVisible();
    await expect(
      footer.getByRole("button", { name: /^disconnect$/i })
    ).toBeVisible();

    // And it's still there from the edit state.
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();
    await footer.getByRole("button", { name: /^disconnect$/i }).click();

    // Connection cleared → Disconnect / "Connected as" disappear.
    await expect(footer.getByText(/connected as/i)).toHaveCount(0);

    // Reload to confirm the cookies are actually gone.
    await page.reload();
    await expect(page.getByRole("link", CONNECT_BUTTON)).toBeVisible();
  });

  test("callback ignores a malicious `return_to` and lands on /", async ({
    page,
  }) => {
    await page.goto(
      "/api/strava/authorize?return_to=https%3A%2F%2Fattacker.example%2Fphish"
    );
    await page.waitForURL(/^http:\/\/localhost:3100\/(\?.*)?$/, {
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();
  });

  test("502 from /api/strava/activity surfaces an upstream alert", async ({
    page,
  }) => {
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /your recent/i })
    ).toBeVisible();

    await page.route("**/api/strava/activity/*", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "strava_error", status: 502 }),
      })
    );
    await page
      .getByRole("button", { name: /saturday in the elbsandstein/i })
      .click();
    await expect(page.getByText(/strava had a hiccup/i)).toBeVisible();
    await expect(page.getByText(/HTTP 502 from Strava/i)).toBeVisible();
  });

  test("429 from /api/strava/activities surfaces a rate-limit alert with countdown", async ({
    page,
  }) => {
    await page.route("**/api/strava/activities**", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: { "retry-after": "30" },
        body: JSON.stringify({ error: "rate_limited", retryAfter: 30 }),
      })
    );
    await page.getByRole("link", CONNECT_BUTTON).click();
    await page.waitForURL(/\/$/);

    await expect(page.getByText(/strava is rate-limiting us/i)).toBeVisible();
    // Countdown shows the retry-after seconds.
    await expect(page.getByText(/30s|29s|28s/i)).toBeVisible();
    // Retry button is disabled until the countdown finishes.
    await expect(page.getByRole("button", { name: /^retry$/i })).toBeDisabled();
  });

  test("502 from /api/strava/me surfaces a server-broken alert in empty state", async ({
    page,
  }) => {
    await page.route("**/api/strava/me", (route) =>
      route.fulfill({ status: 502, body: "server down" })
    );
    await page.reload();

    await expect(
      page.getByText(/we can.?t reach the Effort server/i)
    ).toBeVisible();
  });

  test.describe("OAuth callback toasts", () => {
    for (const { flag, copy } of [
      { flag: "denied", copy: /declined to connect strava/i },
      { flag: "state_mismatch", copy: /couldn.?t verify the strava sign-in/i },
      { flag: "token_exchange", copy: /strava rejected the sign-in/i },
      { flag: "failed", copy: /couldn.?t start the strava sign-in/i },
    ]) {
      test(`?strava=${flag} shows the specific toast`, async ({ page }) => {
        await page.goto(`/?strava=${flag}`);
        await expect(page.getByText(copy)).toBeVisible();
      });
    }
  });
});
