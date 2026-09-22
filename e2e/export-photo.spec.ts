import { promises as fs } from "node:fs";

import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";

import {
  QUADRANT_PNG_BASE64,
  SOLID_MAGENTA_PNG_BASE64,
  solidPngBuffer,
} from "./fixtures";
import {
  enterEditViaUpload,
  selectCarousel,
  selectSingleCard,
  selectTheme,
} from "./helpers";

/**
 * Regression guard: the uploaded background photo must actually land in the
 * exported PNG — for BOTH the single card and the carousel. These tests upload
 * a solid-magenta photo, rasterise a real export, decode the resulting PNG and
 * assert the magenta made it in.
 *
 * Every case runs twice: once through the straight snapdom capture, and once
 * with `?photoComposite=force`, the path WebKit/iOS takes because it refuses to
 * load the photo into the rasterised SVG.
 *
 * Originally written for an html-to-image `cacheBust` footgun (it appended a
 * query to every resource URL, breaking the photo's `blob:` object URL so the
 * background silently dropped). snapdom doesn't rewrite resource URLs, but the
 * guard is just as valuable against any future export-pipeline regression.
 */

const MAGENTA_PHOTO = {
  name: "bg.png",
  mimeType: "image/png",
  buffer: Buffer.from(SOLID_MAGENTA_PNG_BASE64, "base64"),
};

const QUADRANT_PHOTO = {
  name: "quadrants.png",
  mimeType: "image/png",
  buffer: Buffer.from(QUADRANT_PNG_BASE64, "base64"),
};

const PHOTO_INPUT = 'input[type="file"][accept="image/*"]';

/**
 * Classify each quadrant of a downloaded export by the hue that dominates it.
 * Scrims darken the photo and type paints over it, so near-grey pixels are
 * skipped and the majority hue wins — enough to tell "the photo landed the
 * right way round" from "it is mirrored, offset or missing".
 */
async function quadrantHues(page: Page, download: Download): Promise<string[]> {
  const path = await download.path();
  const bytes = await fs.readFile(path);
  return await page.evaluate(async (dataB64: string) => {
    const img = new Image();
    img.src = `data:image/png;base64,${dataB64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return [];
    }
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    const hueOf = (r: number, g: number, b: number): string | null => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Type and scrim wash out the hue; only judge clearly coloured pixels.
      if (max - min < 40) {
        return null;
      }
      if (r === max && g > b + 40) {
        return "yellow";
      }
      if (r === max) {
        return "red";
      }
      return g === max ? "green" : "blue";
    };
    // Sample the middle of each quadrant, away from the edges where a
    // neighbouring quadrant's colour bleeds in.
    return [
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
    ].map(([fx, fy]) => {
      const counts = new Map<string, number>();
      const cx = Math.round(width * fx);
      const cy = Math.round(height * fy);
      const span = Math.round(Math.min(width, height) * 0.08);
      for (let y = cy - span; y <= cy + span; y += 4) {
        for (let x = cx - span; x <= cx + span; x += 4) {
          const i = (y * width + x) * 4;
          const hue = hueOf(data[i], data[i + 1], data[i + 2]);
          if (hue) {
            counts.set(hue, (counts.get(hue) ?? 0) + 1);
          }
        }
      }
      let best = "none";
      let bestCount = 0;
      for (const [hue, count] of counts) {
        if (count > bestCount) {
          best = hue;
          bestCount = count;
        }
      }
      return best;
    });
  }, bytes.toString("base64"));
}

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
  const bytes = await fs.readFile(path);
  const base64 = bytes.toString("base64");
  return await page.evaluate(async (dataB64: string) => {
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

/** Upload the magenta photo onto `theme` and download its 4:5 feed export. */
async function exportSingleCardWithPhoto(
  page: Page,
  theme: string,
  query = ""
): Promise<number> {
  await enterEditViaUpload(page, query);
  await selectSingleCard(page);
  await selectTheme(page, theme);
  await page.locator(PHOTO_INPUT).setInputFiles(MAGENTA_PHOTO);
  await expect(page.getByText(/Photo loaded/iu)).toBeVisible();

  await page.getByTestId("export-action").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download instagram feed/iu }).click();
  return await magentaFraction(page, await downloadPromise);
}

test("single-card Photo export embeds the uploaded background", async ({
  page,
}) => {
  // The Photo theme is photo-forward, so the magenta should dominate; a broken
  // export (photo dropped) reads 0. The threshold cleanly separates the two.
  expect(await exportSingleCardWithPhoto(page, "PHOTO")).toBeGreaterThan(0.2);
});

/**
 * WebKit renders an SVG-as-image with subresource loading disabled, so the
 * photo never paints into the rasterised card and iOS exports came out with the
 * background missing. `?photoComposite=force` selects the fallback that paints
 * the photo onto the export canvas, so Chromium can guard the path iOS takes —
 * the browser that actually needs it is the one we can't run in CI.
 */
const FORCE_COMPOSITE = "?photoComposite=force";

test("single-card Altitude export embeds the uploaded background", async ({
  page,
}) => {
  expect(await exportSingleCardWithPhoto(page, "ALTITUDE")).toBeGreaterThan(
    0.2
  );
});

test("single-card Altitude export embeds the background via the photo composite", async ({
  page,
}) => {
  expect(
    await exportSingleCardWithPhoto(page, "ALTITUDE", FORCE_COMPOSITE)
  ).toBeGreaterThan(0.2);
});

test("single-card Photo export embeds the background via the photo composite", async ({
  page,
}) => {
  expect(
    await exportSingleCardWithPhoto(page, "PHOTO", FORCE_COMPOSITE)
  ).toBeGreaterThan(0.2);
});

/** Export Altitude over the four-quadrant photo and read back its quadrants. */
async function exportQuadrantCard(page: Page, query = ""): Promise<string[]> {
  await enterEditViaUpload(page, query);
  await selectSingleCard(page);
  await selectTheme(page, "ALTITUDE");
  await page.locator(PHOTO_INPUT).setInputFiles(QUADRANT_PHOTO);
  await expect(page.getByText(/Photo loaded/iu)).toBeVisible();

  await page.getByTestId("export-action").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download instagram feed/iu }).click();
  return await quadrantHues(page, await downloadPromise);
}

// A square photo cover-fits a 4:5 card by cropping its sides, so each quadrant
// of the photo still owns the matching quadrant of the card.
const EXPECTED_QUADRANTS = ["red", "green", "blue", "yellow"];

test("an oversized photo still reaches the export", async ({ page }) => {
  // Strava hands out renditions up to 5000px. Decoding ~19 MP twice is what a
  // phone can't afford, so the photo is capped on the way in — this asserts it
  // survives that trip and still lands in the PNG.
  await enterEditViaUpload(page);
  await selectSingleCard(page);
  await selectTheme(page, "ALTITUDE");
  await page.locator(PHOTO_INPUT).setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: solidPngBuffer(5000, 3750, [255, 0, 255]),
  });
  await expect(page.getByText(/Photo loaded/iu)).toBeVisible();

  // It really was capped — otherwise this test would pass on a 19 MP photo and
  // guard nothing.
  const longEdge = await page.evaluate(async () => {
    const el = document.querySelector<HTMLElement>("[data-effort-photo]");
    const draw = JSON.parse(el?.dataset.effortPhoto ?? "{}") as {
      src?: string;
    };
    const img = new Image();
    img.src = draw.src ?? "";
    await img.decode();
    return Math.max(img.naturalWidth, img.naturalHeight);
  });
  expect(longEdge).toBeLessThanOrEqual(3840);

  await page.getByTestId("export-action").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download instagram feed/iu }).click();
  expect(await magentaFraction(page, await downloadPromise)).toBeGreaterThan(
    0.2
  );
});

test("the exported photo keeps its orientation", async ({ page }) => {
  expect(await exportQuadrantCard(page)).toEqual(EXPECTED_QUADRANTS);
});

test("the composited photo keeps its orientation", async ({ page }) => {
  // The composite paints the photo itself, so this is where a cover-fit, pan or
  // mirror mistake would show up — the straight capture can't make one.
  expect(await exportQuadrantCard(page, FORCE_COMPOSITE)).toEqual(
    EXPECTED_QUADRANTS
  );
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
  await expect(page.getByText(/from your photo/iu)).toBeVisible({
    timeout: 10_000,
  });
});

async function exportCarouselWithPhoto(
  page: Page,
  query = ""
): Promise<number> {
  await enterEditViaUpload(page, query);
  // Switch to carousel explicitly so the test is independent of the default mode.
  await selectCarousel(page);
  await selectTheme(page, "EXPOSURE");
  await page.locator(PHOTO_INPUT).setInputFiles(MAGENTA_PHOTO);
  // The carousel only draws the photo once its natural size resolves; the
  // "Adjust photo" affordance is gated on the same condition, so its
  // appearance means the panorama is ready to rasterise.
  await expect(
    page.getByRole("button", { name: /adjust photo/iu })
  ).toBeVisible();

  // Export opens the shared overview; download the Instagram Feed strip set.
  await page.getByRole("button", { name: /export carousel/iu }).click();
  await expect(page.getByRole("heading", { name: /pick a/iu })).toBeVisible();
  // The overview deck redraws the photo once its natural size re-resolves; wait
  // for the rasterised photo layer so the export can't capture a photo-less frame.
  await page.locator('[style*="blob:"]').first().waitFor({ state: "attached" });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download instagram feed/iu }).click();
  return await magentaFraction(page, await downloadPromise);
}

test("carousel Exposure export embeds the uploaded background", async ({
  page,
}) => {
  expect(await exportCarouselWithPhoto(page)).toBeGreaterThan(0.2);
});

test("carousel Exposure export embeds the background via the photo composite", async ({
  page,
}) => {
  // Each slide draws the same photo at its own strip offset, so the composite
  // has to place several layers — the case the single card can't cover.
  expect(await exportCarouselWithPhoto(page, FORCE_COMPOSITE)).toBeGreaterThan(
    0.2
  );
});
