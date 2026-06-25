import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "@storybook/nextjs-vite";
// The app's global stylesheet: Tailwind layer + the OKLCH theme tokens
// (--primary, --foreground, …) every card and chrome component reads.
// Importing it here is what makes stories render with the real styles.
import "../app/globals.css";
import { IconDefaults } from "../components/app/icon-defaults";
// The app loads its fonts on <html> in app/layout.tsx, which Storybook never
// renders — so without this every theme's `var(--font-*)` would fall back to a
// system face. Apply the same variable set on a wrapper around every story.
import { fontVariables } from "../lib/fonts";
import { backgroundGlobalTypes, DEFAULT_BACKGROUND } from "./backgrounds";
import { withBackground } from "./with-background";
import { DEFAULT_SAFE_ZONES, safeZoneGlobalTypes } from "./with-format-matrix";

// CSF Next: the project annotations are created with `definePreview`, and theme
// stories build their meta from this default export (`preview.meta(...)`).
export default definePreview({
  // Passing the addons here (not just in main.ts) is what gives the CSF Next
  // factories their types — `definePreview` infers the renderer from them, and
  // an empty list would collapse it to `never`.
  addons: [addonA11y(), addonDocs()],
  // `withFonts` defines the `--font-*` variables on a common ancestor; then
  // `withBackground` resolves the toolbar Background preset / per-story upload
  // into a `photoUrl` for every theme story (harmless on non-photo stories).
  decorators: [
    (Story) => (
      <IconDefaults>
        <Story />
      </IconDefaults>
    ),
    (Story) => (
      <div className={fontVariables}>
        <Story />
      </div>
    ),
    withBackground,
  ],
  globalTypes: { ...backgroundGlobalTypes, ...safeZoneGlobalTypes },
  initialGlobals: {
    background: DEFAULT_BACKGROUND,
    safeZones: DEFAULT_SAFE_ZONES,
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
});
