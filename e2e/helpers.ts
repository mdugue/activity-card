import { expect, type Page } from "@playwright/test";

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
