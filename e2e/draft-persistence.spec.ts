import { expect, test } from "@playwright/test";
import { selectSingleCard, uploadActivity } from "./helpers";

test.describe("draft persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("restores the in-progress card after a reload", async ({ page }) => {
    await uploadActivity(page);
    // The app defaults to Carousel; the single card has the simple Title input.
    await selectSingleCard(page);

    // Give the card a distinctive title, then let the debounced auto-save flush
    // to IndexedDB (the save effect waits ~500ms after the last change). Assert
    // on the input value, which the draft restores directly.
    const titleInput = page.getByLabel(/^Title$/i);
    await titleInput.fill("Persisted Loop");
    await expect(titleInput).toHaveValue("Persisted Loop");
    await page.waitForTimeout(800);

    // Reload WITHOUT re-uploading — the draft alone should bring the card back
    // into the editor with the same activity (mode is restored from prefs).
    await page.reload();
    await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();
    await expect(page.getByLabel(/^Title$/i)).toHaveValue("Persisted Loop");
  });

  test("'Start over' discards the draft and returns to the landing screen", async ({
    page,
  }) => {
    await uploadActivity(page);
    // Let the debounced auto-save flush, then start over.
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /start over/i }).click();

    // Confirm dialog → discard.
    await expect(page.getByText(/can't be undone/i)).toBeVisible();
    await page.getByRole("button", { name: /discard card/i }).click();

    // Left the editor for the landing screen.
    await expect(page.getByTestId("theme-picker-trigger")).not.toBeVisible();
    // The draft was cleared, so a reload stays on the landing screen.
    await page.reload();
    await expect(page.getByTestId("theme-picker-trigger")).not.toBeVisible();
  });
});
