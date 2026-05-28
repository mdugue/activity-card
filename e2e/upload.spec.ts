import { expect, test } from "@playwright/test";
import { SINGLE_RUN_GPX, TRIATHLON_FILES } from "./fixtures";
import { selectTheme } from "./helpers";

test.describe("upload", () => {
  test("single file → edit state with parsed activity", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const fileInput = page.locator('input[type="file"][accept=".gpx,.fit"]');
    await fileInput.setInputFiles({
      name: "morning-run.gpx",
      mimeType: "application/gpx+xml",
      buffer: Buffer.from(SINGLE_RUN_GPX),
    });

    // Edit state is recognisable by the theme picker + filename row.
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();
    await expect(page.getByText(/morning-run\.gpx|run_/i)).toBeVisible();
    await expect(page.getByText(/files · assembled/i)).not.toBeVisible();
  });

  test("multiple files → triathlon assembly with computed transitions", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const fileInput = page.locator('input[type="file"][accept=".gpx,.fit"]');
    await fileInput.setInputFiles([
      {
        name: "swim.gpx",
        mimeType: "application/gpx+xml",
        buffer: Buffer.from(TRIATHLON_FILES.swim),
      },
      {
        name: "bike.gpx",
        mimeType: "application/gpx+xml",
        buffer: Buffer.from(TRIATHLON_FILES.bike),
      },
      {
        name: "run.gpx",
        mimeType: "application/gpx+xml",
        buffer: Buffer.from(TRIATHLON_FILES.run),
      },
    ]);

    await expect(page.getByText(/3 files · assembled/i)).toBeVisible();

    // Switch to the triathlon theme — segments should appear with transitions.
    await selectTheme(page, "TRIATHLON");
    // The page mounts the theme twice (visible preview + off-screen export
    // mount); .first() targets the visible preview.
    await expect(page.getByText(/EFFORT TIMELINE/i).first()).toBeVisible();
    // T1 between swim and bike (calculated from timestamps in fixtures.ts):
    // bike start 07:32:30 − swim end 07:30:00 = 2:30
    await expect(page.getByText(/T1 → 2:30/i).first()).toBeVisible();
    await expect(page.getByText(/T2 → 1:30/i).first()).toBeVisible();
  });

  test("rejects non-activity files with a clear error", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator('input[type="file"][accept=".gpx,.fit"]');
    await fileInput.setInputFiles({
      name: "not-an-activity.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await expect(page.getByText(/Drop a \.gpx or \.fit file/i)).toBeVisible();
    // Should NOT have advanced to the edit state.
    await expect(page.getByTestId("theme-picker-trigger")).not.toBeVisible();
  });

  test("Try a sample loads the demo dataset", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /try a sample/i }).click();
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();
  });
});
