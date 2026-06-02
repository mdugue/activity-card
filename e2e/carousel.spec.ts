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
    await enterEditViaUpload(page);
    await page.getByRole("button", { name: /Carousel/i }).click();
  });

  test("generates a default storyboard and renders without page errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // Default deck → 4 slides (Intro · Details ×2 · Wrap-up).
    await expect(page.getByText(/slide 1 \/ 4/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Slide \d+:/i })
    ).toHaveCount(4);

    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });

  test("selecting a thumbnail moves the preview window", async ({ page }) => {
    await page.getByRole("button", { name: /^Slide 3:/i }).click();
    await expect(page.getByText(/slide 3 \/ 4/i)).toBeVisible();
  });

  test("choosing a deck changes the slide count", async ({ page }) => {
    await page.getByRole("button", { name: /3 slides/i }).click();
    await expect(page.getByText(/slide 1 \/ 3/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Slide \d+:/i })
    ).toHaveCount(3);
  });

  test("theme switches via the shared picker below the preview", async ({
    page,
  }) => {
    // Carousel uses its own theme names (Trace, Telemetry, …).
    const trigger = page.getByTestId("theme-picker-trigger");
    await expect(trigger).toContainText(/TRACE/i);
    await trigger.click();
    await page.getByRole("button", { name: /^TELEMETRY/i }).click();
    await expect(trigger).toContainText(/TELEMETRY/i);
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

  test("type-led themes disable the photo control", async ({ page }) => {
    // Frame/Telemetry/Press themes don't render the photo, so the uploader is
    // disabled with an explanatory note rather than offering a dead control.
    await page.getByTestId("theme-picker-trigger").click();
    await page.getByRole("button", { name: /^TELEMETRY/i }).click();
    await expect(page.getByText(/no room for a photo/i)).toBeVisible();
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
