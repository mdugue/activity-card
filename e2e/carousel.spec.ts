import { expect, test } from "@playwright/test";
import { TINY_PNG_BASE64 } from "./fixtures";
import { enterEditViaUpload } from "./helpers";

/**
 * Carousel Post mode (seamless, deck-wide). Runs against the production build,
 * so Base UI's dev-only warnings aren't present; we assert no *uncaught* page
 * errors plus the core flow: storyboard, slide selection, theme switching,
 * deck-wide photo adjust, and the ordered PNG export.
 */
test.describe("carousel mode", () => {
  test.beforeEach(async ({ page }) => {
    // Carousel is the default mode, so uploading lands straight in it.
    await enterEditViaUpload(page);
  });

  test("generates a default storyboard and renders without page errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // Default theme (Trace Dawn) → a tight 3-slide deck.
    await expect(page.getByText(/slide 1 \/ 3/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Slide \d+:/i })
    ).toHaveCount(3);

    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });

  test("selecting a thumbnail moves the preview window", async ({ page }) => {
    await page.getByRole("button", { name: /^Slide 3:/i }).click();
    await expect(page.getByText(/slide 3 \/ 3/i)).toBeVisible();
  });

  test("deck length is fixed per theme (Frame → 4 slides)", async ({
    page,
  }) => {
    await page.getByTestId("theme-picker-trigger").click();
    await page.getByRole("button", { name: /^FRAME/i }).click();
    await expect(
      page.getByRole("button", { name: /^Slide \d+:/i })
    ).toHaveCount(4);
    await expect(page.getByText(/slide 1 \/ 4/i)).toBeVisible();
  });

  test("theme switches via the shared picker below the preview", async ({
    page,
  }) => {
    // Carousel uses its own theme names (Trace Dawn/Dusk, Ascent, Press, …).
    const trigger = page.getByTestId("theme-picker-trigger");
    await expect(trigger).toContainText(/TRACE/i);
    await trigger.click();
    await page.getByRole("button", { name: /^PRESS/i }).click();
    await expect(trigger).toContainText(/PRESS/i);
  });

  test("uploading a photo reveals the deck-wide adjust control", async ({
    page,
  }) => {
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    await expect(page.getByText(/Photo loaded/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /adjust photo/i })
    ).toBeVisible();
  });

  test("type-led themes still accept a background photo", async ({ page }) => {
    // Frame and Press now render a background photo (kept clean via shadows /
    // opaque print boxes), so the uploader stays enabled — no "no room" note.
    await page.getByTestId("theme-picker-trigger").click();
    await page.getByRole("button", { name: /^FRAME/i }).click();
    await expect(page.getByText(/no room for a photo/i)).toHaveCount(0);
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    await expect(page.getByText(/Photo loaded/i)).toBeVisible();
  });

  test("export downloads an ordered PNG set", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export carousel/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^effort_.+_carousel_01\.png$/
    );
  });
});
