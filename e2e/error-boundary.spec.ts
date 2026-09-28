import { expect, test } from "@playwright/test";

import { openWizard } from "./helpers";

// The editor, export sheets and Strava picker are lazy chunks. If one fails to
// load (flaky network, or a tab left open across a deploy), app/error.tsx must
// catch it instead of crashing to Next's bare "Application error" screen.

test("a failed lazy chunk shows the route error screen", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  // The wizard is a post-hydration lazy chunk and opening it warms the editor
  // chunk, so no single element signals "every chunk the landing fetches on its
  // own is in"; only a quiet network does, before chunk requests are blocked.
  // Readiness here IS "all post-hydration chunk fetches settled" (see above); no DOM signal exists for it
  await page.waitForLoadState("networkidle");
  await page.route("**/_next/static/chunks/**", async (route) => {
    await route.abort();
  });
  await openWizard(page);
  await page.getByRole("button", { name: /^run$/iu }).click();
  await page.getByRole("button", { name: /open the editor/iu }).click();
  await expect(
    page.getByRole("heading", { name: /something went wrong/iu })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("button", { name: /reload page/iu })
  ).toBeVisible();
});
