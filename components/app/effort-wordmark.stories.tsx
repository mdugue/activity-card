import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { EffortWordmark } from "./effort-wordmark";

const meta = {
  component: EffortWordmark,
  tags: ["ai-generated"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof EffortWordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: "sm" } };

// The single project-wide CssCheck. The wordmark's text uses the Tailwind
// `text-3xl` utility (1.875rem → 30px). A concrete computed font-size is proof
// the app's global stylesheet (Tailwind layer from globals.css) actually
// compiled and loaded into the preview — `toBeVisible` alone would pass even
// fully unstyled.
export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const word = canvas.getByText("EFFORT");
    await expect(getComputedStyle(word).fontSize).toBe("30px");
  },
};
