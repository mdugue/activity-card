import { promises as fs } from "node:fs";
import { type Download, expect, type Page, test } from "@playwright/test";
import { SOLID_MAGENTA_PNG_BASE64 } from "./fixtures";
import {
  enterEditViaUpload,
  selectCarousel,
  selectSingleCard,
  selectTheme,
} from "./helpers";

/**
 * Regression guard for the `cacheBust` blob-URL bug: html-to-image appended a
 * query to every resource URL, which broke the photo's `blob:` object URL so
 * the uploaded background silently dropped out of BOTH the single-card and the
 * carousel export. These tests upload a solid-magenta photo, rasterise a real
 * export, decode the resulting PNG and assert the magenta actually made it in.
 */

const MAGENTA_PHOTO = {
  name: "bg.png",
  mimeType: "image/png",
  buffer: Buffer.from(SOLID_MAGENTA_PNG_BASE64, "base64"),
};

const PHOTO_INPUT = 'input[type="file"][accept="image/*"]';

/**
 * Decode a downloaded PNG in-page and return the fraction of sampled pixels
 * that read as magenta-ish — red and blue both clearly dominating green. The
 * uploaded background is solid magenta, so a healthy export reads mostly
 * magenta; an export that dropped the photo reads ~none.
 */
async function magentaFraction(
  page: Page,
  download: Download
): Promise<number> {
  const path = await download.path();
  const base64 = (await fs.readFile(path)).toString("base64");
  return page.evaluate(async (dataB64: string) => {
    const img = new Image();
    img.src = `data:image/png;base64,${dataB64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return 0;
    }
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    let magenta = 0;
    let total = 0;
    // Sample a sparse grid — full per-pixel scan is needless for a fraction.
    for (let y = 0; y < height; y += 16) {
      for (let x = 0; x < width; x += 16) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        total++;
        // Tolerant of overlays/desaturation: magenta survives as long as red
        // and blue stay well above green.
        if (r > 80 && b > 80 && g + 30 < r && g + 30 < b) {
          magenta++;
        }
      }
    }
    return total === 0 ? 0 : magenta / total;
  }, base64);
}

test("single-card Photo export embeds the uploaded background", async ({
  page,
}) => {
  await enterEditViaUpload(page);
  await selectSingleCard(page);
  await selectTheme(page, "PHOTO");
  await page.locator(PHOTO_INPUT).setInputFiles(MAGENTA_PHOTO);
  await expect(page.getByText(/Photo loaded/i)).toBeVisible();

  // Open the export sheet and download the 4:5 Instagram Feed (native render).
  await page.getByTestId("export-action").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download instagram feed/i }).click();
  const fraction = await magentaFraction(page, await downloadPromise);

  // The Photo theme is photo-forward, so the magenta should dominate; a broken
  // export (photo dropped) reads 0. The threshold cleanly separates the two.
  expect(fraction).toBeGreaterThan(0.2);
});

test("photo upload yields FROM YOUR PHOTO colour schemes (worker palette extraction)", async ({
  page,
}) => {
  // The COLOUR control only renders the photo-derived swatch row once
  // node-vibrant's extraction resolves — since extraction now runs in a Web
  // Worker, this asserts the worker round-trip works in the production build.
  // Carousel's photo-first Exposure surfaces the swatch row; select it
  // explicitly so the test doesn't depend on the editor's default mode.
  await enterEditViaUpload(page);
  await selectCarousel(page);
  await page.locator(PHOTO_INPUT).setInputFiles(MAGENTA_PHOTO);
  await expect(page.getByText(/from your photo/i)).toBeVisible({
    timeout: 10_000,
  });
});

test("carousel Exposure export embeds the uploaded background", async ({
  page,
}) => {
  await enterEditViaUpload(page);
  // Switch to carousel explicitly so the test is independent of the default mode.
  await selectCarousel(page);
  await selectTheme(page, "EXPOSURE");
  await page.locator(PHOTO_INPUT).setInputFiles(MAGENTA_PHOTO);
  // The carousel only draws the photo once its natural size resolves; the
  // "Adjust photo" affordance is gated on the same condition, so its
  // appearance means the panorama is ready to rasterise.
  await expect(
    page.getByRole("button", { name: /adjust photo/i })
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export carousel/i }).click();
  const fraction = await magentaFraction(page, await downloadPromise);

  expect(fraction).toBeGreaterThan(0.2);
});
