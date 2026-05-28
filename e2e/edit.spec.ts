import { expect, test } from "@playwright/test";
import { TINY_PNG_BASE64 } from "./fixtures";
import { selectTheme } from "./helpers";

test.describe("edit controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /try a sample/i }).click();
    await expect(
      page.getByText(/FILE LOADED|MULTI-SPORT LOADED/i)
    ).toBeVisible();
  });

  test("title editor updates the card preview live", async ({ page }) => {
    const titleInput = page.getByLabel(/^Activity title$/i);
    await titleInput.fill("Sunrise Loop");
    // The Path theme title shows the user-entered value in the preview.
    await expect(
      page.locator("text=/Sunrise Loop|SUNRISE LOOP/i").first()
    ).toBeVisible();
  });

  test("heart rate toggle drives the AVG HR cell value", async ({ page }) => {
    await selectTheme(page, "DATA");
    const hrSwitch = page.getByRole("switch", { name: /heart rate/i });

    // Sample ride's avg_heart_rate is 142. With HR on the value renders in
    // the Data theme's AVG HR cell; with HR off the Cell falls back to the
    // bare label and the bpm value disappears from the document.
    const hrValue = page.locator("text=/142\\s*bpm/i");

    if (!(await hrSwitch.isChecked())) {
      await hrSwitch.click();
    }
    await expect(hrSwitch).toBeChecked();
    await expect(hrValue.first()).toBeVisible();

    await hrSwitch.click();
    await expect(hrSwitch).not.toBeChecked();
    await expect(hrValue).toHaveCount(0);
  });

  test("photo upload populates the Photo theme background", async ({
    page,
  }) => {
    await selectTheme(page, "PHOTO");
    const photoInput = page.locator('input[type="file"][accept="image/*"]');
    await photoInput.setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    await expect(page.getByText(/Photo loaded/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Remove/i })).toBeVisible();
  });

  test("athlete name input persists across reload", async ({ page }) => {
    const nameInput = page.getByRole("textbox", { name: /athlete name/i });
    await nameInput.fill("RIVER STONE");
    await page.reload();
    await page.getByRole("button", { name: /try a sample/i }).click();
    await expect(
      page.getByRole("textbox", { name: /athlete name/i })
    ).toHaveValue("RIVER STONE");
  });
});

test.describe("persistence", () => {
  test("theme + accent + visibility survive a reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /try a sample/i }).click();
    await expect(page.getByText(/FILE LOADED/i)).toBeVisible();

    await selectTheme(page, "EDITORIAL");
    const hrSwitch = page.getByRole("switch", { name: /heart rate/i });
    await hrSwitch.click(); // turn HR on

    await page.reload();
    // Empty state after reload (data isn't persisted) — but UI prefs should
    // come back when we load a sample again.
    await page.getByRole("button", { name: /try a sample/i }).click();
    await expect(page.getByTestId("theme-picker-trigger")).toContainText(
      "EDITORIAL"
    );
    await expect(
      page.getByRole("switch", { name: /heart rate/i })
    ).toBeChecked();
  });
});
