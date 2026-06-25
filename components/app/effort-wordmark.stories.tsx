import { expect } from "storybook/test";
import preview from "../../.storybook/preview";
import { EffortWordmark } from "./effort-wordmark";

const meta = preview.meta({
  component: EffortWordmark,
  tags: ["ai-generated"],
  parameters: { layout: "centered" },
});

export const Default = meta.story({ args: { size: "default" } });
export const Small = meta.story({ args: { size: "sm" } });

// The single project-wide CssCheck. The wordmark's text uses the Tailwind
// `text-3xl` utility (1.875rem → 30px). A concrete computed font-size is proof
// the app's global stylesheet (Tailwind layer from globals.css) actually
// compiled and loaded into the preview — `toBeVisible` alone would pass even
// fully unstyled.
export const CssCheck = meta.story({
  play: async ({ canvas }) => {
    const word = canvas.getByText("EFFORT");
    await expect(getComputedStyle(word).fontSize).toBe("30px");
  },
});
