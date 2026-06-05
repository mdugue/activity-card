import type { Preview } from "@storybook/nextjs-vite";
// The app's global stylesheet: Tailwind layer + the OKLCH theme tokens
// (--primary, --foreground, …) every card and chrome component reads.
// Importing it here is what makes stories render with the real styles.
import "../app/globals.css";
import { backgroundGlobalTypes, DEFAULT_BACKGROUND } from "./backgrounds";
import { withBackground } from "./with-background";

const preview: Preview = {
  // Resolves the toolbar Background preset / per-story upload into a `photoUrl`
  // for every theme story. Harmless on stories that don't render a photo.
  decorators: [withBackground],
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
