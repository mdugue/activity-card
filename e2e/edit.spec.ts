import { expect, test } from "@playwright/test";
import { TINY_PNG_BASE64 } from "./fixtures";
import { enterEditViaUpload, selectTheme, uploadActivity } from "./helpers";

test.describe("edit controls", () => {
  test.beforeEach(async ({ page }) => {
    await enterEditViaUpload(page);
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

    // SINGLE_RUN_GPX emits a constant HR of 150, so the computed mean is
    // exactly 150 — stable for the visibility-toggle round trip.
    const hrValue = page.locator("text=/150\\s*bpm/i");

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
    // Reload without clearing localStorage; re-upload to re-enter edit.
    await page.reload();
    await uploadActivity(page);
    await expect(
      page.getByRole("textbox", { name: /athlete name/i })
    ).toHaveValue("RIVER STONE");
  });
});

test.describe("persistence", () => {
  test("theme + accent + visibility survive a reload", async ({ page }) => {
    await enterEditViaUpload(page);

    await selectTheme(page, "EDITORIAL");
    const hrSwitch = page.getByRole("switch", { name: /heart rate/i });
    // Default is now `heartRate: true`. Toggle off so we can verify the
    // change survives a reload — picking a non-default value is the only
    // way this test exercises real persistence.
    if (await hrSwitch.isChecked()) {
      await hrSwitch.click();
    }

    await page.reload();
    // Empty state after reload (data isn't persisted) — but UI prefs should
    // come back when we re-enter the edit state. Keep localStorage so the
    // theme / visibility we just set is still there.
    await uploadActivity(page);
    await expect(page.getByTestId("theme-picker-trigger")).toContainText(
      "EDITORIAL"
    );
    await expect(
      page.getByRole("switch", { name: /heart rate/i })
    ).not.toBeChecked();
  });
});
