import { expect, type Page } from "@playwright/test";
import { SINGLE_RUN_GPX } from "./fixtures";

/**
 * Select the named theme. Themes are an inline rail of toggle buttons in the
 * THEME section now (no popup) — each button is named "<LABEL> <tagline>", so
 * we click the one whose name starts with the label and confirm it's pressed.
 */
export async function selectTheme(page: Page, theme: string): Promise<void> {
  const btn = page.getByRole("button", {
    name: new RegExp(`^${theme}\\b`, "i"),
  });
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
}

/**
 * Switch to Single Card mode. The app now defaults to Carousel, so single-card
 * specs flip to it explicitly after entering the edit state.
 */
export async function selectSingleCard(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: /Single Card/i });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
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
  await expect(page.getByTestId("export-action")).toBeVisible();
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
