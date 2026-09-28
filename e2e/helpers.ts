import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { SINGLE_RUN_GPX } from "./fixtures";

const ARIA_PRESSED = "aria-pressed";

/**
 * Select the named theme. Themes are an inline rail of toggle buttons in the
 * THEME section now (no popup) — each button is named "<LABEL> <tagline>", so
 * we click the one whose name starts with the label and confirm it's pressed.
 */
export const selectTheme = async (page: Page, theme: string): Promise<void> => {
  const btn = page.getByRole("button", {
    name: new RegExp(`^${theme}\\b`, "iu"),
  });
  await btn.click();
  await expect(btn).toHaveAttribute(ARIA_PRESSED, "true");
};

/**
 * Switch to Single Card mode. Specs flip to it explicitly rather than leaning on
 * the editor's default, so they stay green regardless of which mode is default.
 * The mode toggle is idempotent — clicking the active mode is a safe no-op — so
 * this works whether the editor opened in single-card or carousel.
 */
export const selectSingleCard = async (page: Page): Promise<void> => {
  const button = page.getByRole("button", { name: /Single Card/iu });
  await button.click();
  await expect(button).toHaveAttribute(ARIA_PRESSED, "true");
};

/**
 * Switch to Carousel mode. The companion to {@link selectSingleCard} — carousel
 * specs call it explicitly instead of assuming carousel is the default, so they
 * survive a change to the default `CardMode`.
 */
export const selectCarousel = async (page: Page): Promise<void> => {
  const button = page.getByRole("button", { name: /^Carousel$/iu });
  await button.click();
  await expect(button).toHaveAttribute(ARIA_PRESSED, "true");
};

/**
 * Open the get-started onboarding wizard from the landing. Activity + photo
 * intake (file upload, Strava, samples) all live inside it now.
 */
export const openWizard = async (page: Page): Promise<void> => {
  // The landing shows the same "Get started" CTA twice — in the hero and again
  // in the closing footer — so target the first (hero) one.
  await page
    .getByRole("button", { name: /get started/iu })
    .first()
    .click();
  // Sync point: the dialog must be open before callers interact with it.
  await expect(page.getByRole("dialog")).toBeVisible();
};

/** Open the wizard and click the official "Connect with Strava" button. */
export const connectStrava = async (page: Page): Promise<void> => {
  await openWizard(page);
  await page.getByRole("link", { name: /connect with strava/iu }).click();
};

/**
 * Upload the default single-run fixture through the wizard and wait for the
 * edit state. Use `enterEditViaUpload` for the common "clean session" path;
 * call `uploadActivity` directly when a test needs to keep localStorage state
 * (e.g. across a reload).
 */
export const uploadActivity = async (page: Page): Promise<void> => {
  await openWizard(page);
  const fileInput = page.locator('input[type="file"][accept=".gpx,.fit"]');
  await fileInput.setInputFiles({
    buffer: Buffer.from(SINGLE_RUN_GPX),
    mimeType: "application/gpx+xml",
    name: "sample-run.gpx",
  });
  await page.getByRole("button", { name: /open the editor/iu }).click();
  await expect(page.getByTestId("export-action")).toBeVisible();
};

/**
 * Fresh-session entry into the edit state. Replaces the old "Try a sample"
 * button — using a real upload keeps the parse → edit pipeline honest.
 * `query` appends a query string to the landing URL (e.g. the export pipeline's
 * `?photoComposite=force` switch).
 */
export const enterEditViaUpload = async (
  page: Page,
  query = ""
): Promise<void> => {
  await page.goto(`/${query}`);
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await uploadActivity(page);
};

/**
 * Wait until a freshly rendered view has settled: webfonts have loaded (or
 * fallen back), checked on an animation frame — so the commit has painted and
 * its deferred `useEffect`s have run, surfacing any runtime error they throw.
 */
export const waitForRenderSettled = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => document.fonts.status === "loaded", null, {
    polling: "raf",
  });
};
