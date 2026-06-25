import { expect, test } from "@playwright/test";
import { TINY_PNG_BASE64 } from "./fixtures";
import { enterEditViaUpload, selectCarousel } from "./helpers";

/**
 * Carousel Post mode (seamless, deck-wide). Runs against the production build,
 * so Base UI's dev-only warnings aren't present; we assert no *uncaught* page
 * errors plus the core flow: storyboard, slide selection, theme switching,
 * deck-wide photo adjust, and the ordered PNG export.
 */
test.describe("carousel mode", () => {
  test.beforeEach(async ({ page }) => {
    await enterEditViaUpload(page);
    // Select carousel explicitly so the suite is independent of the editor's
    // default mode.
    await selectCarousel(page);
  });

  test("generates a default storyboard and renders without page errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // Default theme (Trace) → a tight 3-slide deck.
    await expect(page.getByTestId("carousel-preview")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Slide \d+:/i })
    ).toHaveCount(3);

    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });

  test("selecting a thumbnail moves the preview window", async ({ page }) => {
    const slide3 = page.getByRole("button", { name: /^Slide 3:/i });
    await slide3.click();
    await expect(slide3).toHaveAttribute("aria-pressed", "true");
  });

  test("deck length is fixed per theme (Frame → 4 slides)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /^FRAME\b/i }).click();
    await expect(
      page.getByRole("button", { name: /^Slide \d+:/i })
    ).toHaveCount(4);
  });

  test("theme switches via the rail in the THEME section", async ({ page }) => {
    // Carousel uses its own theme names (Trace, Ascent, Press, …).
    // Default is Trace → its toggle is pressed; picking Press selects it.
    await expect(
      page.getByRole("button", { name: /^TRACE\b/i })
    ).toHaveAttribute("aria-pressed", "true");
    const press = page.getByRole("button", { name: /^PRESS\b/i });
    await press.click();
    await expect(press).toHaveAttribute("aria-pressed", "true");
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
    await page.getByRole("button", { name: /^FRAME\b/i }).click();
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

test.describe("carousel photo backdrop", () => {
  test.beforeEach(async ({ page }) => {
    await enterEditViaUpload(page);
    await selectCarousel(page);
  });

  test("'Use as background' toggles the deck photo and its controls", async ({
    page,
  }) => {
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    await expect(page.getByText(/Photo loaded/i)).toBeVisible();

    // Photo on (every carousel theme defaults to showing it): the filter row
    // and the deck-wide Adjust affordance are present.
    await expect(page.getByText(/^FILTER$/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /adjust photo/i })
    ).toBeVisible();

    // Toggle the backdrop off: the photo controls and Adjust disappear (the
    // deck falls back to the theme's designed, photo-free look).
    const backdrop = page.getByRole("switch", { name: /use as background/i });
    await expect(backdrop).toBeChecked();
    await backdrop.click();
    await expect(page.getByText(/^FILTER$/)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /adjust photo/i })
    ).toHaveCount(0);

    // And back on.
    await backdrop.click();
    await expect(page.getByText(/^FILTER$/)).toBeVisible();
  });
});
