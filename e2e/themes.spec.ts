import { expect, test } from "@playwright/test";
import { enterEditViaUpload, selectTheme } from "./helpers";

const THEMES = [
  "PATH",
  "ALTITUDE",
  "PHOTO",
  "MINIMAL",
  "DATA",
  "EDITORIAL",
  "TRIATHLON",
] as const;

test.describe("themes", () => {
  test.beforeEach(async ({ page }) => {
    await enterEditViaUpload(page);
  });

  for (const theme of THEMES) {
    test(`${theme.toLowerCase()} theme renders without console errors`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") {
          errors.push(m.text());
        }
      });

      await selectTheme(page, theme);

      // Give the theme a beat to render so a runtime error inside a deferred
      // useEffect or font fallback has time to surface.
      await page.waitForTimeout(200);
      expect(errors).toEqual([]);
    });
  }

  test("download button exports a PNG at 1080×1350 (2× pixel ratio)", async ({
    page,
  }) => {
    // Path theme — fastest to render.
    await selectTheme(page, "PATH");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download png/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^effort_.+\.png$/);

    // Save and check dimensions via a quick image-header read.
    const path = await download.path();
    const fs = await import("node:fs/promises");
    const buf = await fs.readFile(path);
    // PNG dimensions live at offsets 16-19 (width) and 20-23 (height), big-endian.
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(2160);
    expect(height).toBe(2700);
  });
});
