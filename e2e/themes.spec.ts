import { expect, test } from "@playwright/test";
import { enterEditViaUpload, selectSingleCard, selectTheme } from "./helpers";

const THEMES = [
  "ALTITUDE",
  "PHOTO",
  "STRATA",
  "PATH",
  "EDITORIAL",
  "DATA",
  "TRIATHLON",
] as const;

test.describe("themes", () => {
  test.beforeEach(async ({ page }) => {
    await enterEditViaUpload(page);
    await selectSingleCard(page);
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

  test("export sheet downloads the feed PNG at 1080×1350 (2× pixel ratio)", async ({
    page,
  }) => {
    // Path theme — fastest to render.
    await selectTheme(page, "PATH");
    // Open the export sheet, then download the 4:5 Instagram Feed format —
    // the master canvas, rendered natively (no Hybrid frame).
    await page.getByTestId("export-action").click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /download instagram feed/i })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^effort_.+\.png$/);

    // Save and check dimensions via a quick image-header read.
    const fs = await import("node:fs/promises");
    // PNG dimensions live at offsets 16-19 (width) and 20-23 (height), big-endian.
    const feed = await fs.readFile(await download.path());
    expect(feed.readUInt32BE(16)).toBe(2160);
    expect(feed.readUInt32BE(20)).toBe(2700);

    // The Hybrid frame retargets the same theme to a 9:16 story (2× = 2160×3840).
    const storyPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /download instagram story/i })
      .click();
    const story = await fs.readFile(await (await storyPromise).path());
    expect(story.readUInt32BE(16)).toBe(2160);
    expect(story.readUInt32BE(20)).toBe(3840);
  });
});
