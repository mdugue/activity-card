import { promises as fs } from "node:fs";
import { type Download, expect, type Page, test } from "@playwright/test";
import { SOLID_MAGENTA_PNG_BASE64 } from "./fixtures";
import { enterEditViaUpload, selectSingleCard, selectTheme } from "./helpers";

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

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download png/i }).click();
  const fraction = await magentaFraction(page, await downloadPromise);

  // The Photo theme is photo-forward, so the magenta should dominate; a broken
  // export (photo dropped) reads 0. The threshold cleanly separates the two.
  expect(fraction).toBeGreaterThan(0.2);
});

test("carousel Exposure export embeds the uploaded background", async ({
  page,
}) => {
  // Carousel is the default mode, so uploading lands straight in it.
  await enterEditViaUpload(page);
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
