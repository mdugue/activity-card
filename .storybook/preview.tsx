import type { Decorator, Preview } from "@storybook/nextjs-vite";
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

const withFonts: Decorator = (Story) => (
  <div className={fontVariables}>
    <Story />
  </div>
);

// The app sets duotone as the Phosphor default in app/layout.tsx, which
// Storybook never renders — mirror it so editor-chrome stories match the app.
const withIconDefaults: Decorator = (Story) => (
  <IconDefaults>
    <Story />
  </IconDefaults>
);

const preview: Preview = {
  // `withFonts` defines the `--font-*` variables on a common ancestor; then
  // `withBackground` resolves the toolbar Background preset / per-story upload
  // into a `photoUrl` for every theme story (harmless on non-photo stories).
  decorators: [withIconDefaults, withFonts, withBackground],
  globalTypes: backgroundGlobalTypes,
  initialGlobals: { background: DEFAULT_BACKGROUND },
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
};

export default preview;
