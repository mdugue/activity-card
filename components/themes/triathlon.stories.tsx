import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SAMPLE_TRI } from "@/components/app/sample-data";
import { ThemeTriathlon } from "./triathlon";

const meta = {
  component: ThemeTriathlon,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ThemeTriathlon>;

export default meta;
type Story = StoryObj<typeof meta>;

const TRI_TITLE = /Lanzarote/;

// Multi-sport card — only renders when segments are present; the title proves
// the segmented fixture was accepted and the card mounted.
export const Default: Story = {
  args: { data: SAMPLE_TRI },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(TRI_TITLE)).toBeVisible();
  },
};
