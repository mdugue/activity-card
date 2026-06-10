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
 * Open the get-started onboarding wizard from the landing. Activity + photo
 * intake (file upload, Strava, samples) all live inside it now.
 */
export async function openWizard(page: Page): Promise<void> {
  // The landing shows the same "Get started" CTA twice — in the hero and again
  // in the closing footer — so target the first (hero) one.
  await page
    .getByRole("button", { name: /get started/i })
    .first()
    .click();
  // Sync point: the dialog must be open before callers interact with it.
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** Open the wizard and click the official "Connect with Strava" button. */
export async function connectStrava(page: Page): Promise<void> {
  await openWizard(page);
  await page.getByRole("link", { name: /connect with strava/i }).click();
}

/**
 * Upload the default single-run fixture through the wizard and wait for the
 * edit state. Use `enterEditViaUpload` for the common "clean session" path;
 * call `uploadActivity` directly when a test needs to keep localStorage state
 * (e.g. across a reload).
 */
export async function uploadActivity(page: Page): Promise<void> {
  await openWizard(page);
  const fileInput = page.locator('input[type="file"][accept=".gpx,.fit"]');
  await fileInput.setInputFiles({
    name: "sample-run.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.from(SINGLE_RUN_GPX),
  });
  await page.getByRole("button", { name: /open the editor/i }).click();
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
