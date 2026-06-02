import { expect, type Page } from "@playwright/test";
import { SINGLE_RUN_GPX } from "./fixtures";

/**
 * Open the theme picker and select the named theme. The new theme switcher
 * shows the current theme as a button that opens a popover/drawer; we click
 * the trigger first, then the option, and wait for the trigger to reflect
 * the selection.
 */
export async function selectTheme(page: Page, theme: string): Promise<void> {
  const trigger = page.getByTestId("theme-picker-trigger");
  await trigger.click();
  // Popover items are buttons named "<LABEL>\n<tagline>".
  await page
    .getByRole("button", { name: new RegExp(`^${theme}\\b`, "i") })
    .click();
  await expect(trigger).toContainText(theme);
}

/**
 * Upload the default single-run fixture and wait for the edit state. Use
 * `enterEditViaUpload` for the common "clean session" path; call
 * `uploadActivity` directly when a test needs to keep localStorage state
 * (e.g. across a reload).
 */
export async function uploadActivity(page: Page): Promise<void> {
  const fileInput = page.locator('input[type="file"][accept=".gpx,.fit"]');
  await fileInput.setInputFiles({
    name: "sample-run.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.from(SINGLE_RUN_GPX),
  });
  await expect(page.getByTestId("theme-picker-trigger")).toBeVisible();
}

/**
 * Fresh-session entry into the edit state. Replaces the old "Try a sample"
 * button — using a real upload keeps the parse → edit pipeline honest.
 */
export async function enterEditViaUpload(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await uploadActivity(page);
}
