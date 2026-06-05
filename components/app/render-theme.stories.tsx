import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { RenderTheme } from "./render-theme";

const meta = {
  component: RenderTheme,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: { data: SAMPLE_RIDE },
} satisfies Meta<typeof RenderTheme>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// The dispatcher must mount the component matching the `theme` id. Asserting the
// title renders under `theme: "path"` proves the right branch was selected and
// handed the data through.
export const Path: Story = {
  args: { theme: "path" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RIDE_TITLE)).toBeVisible();
  },
};

export const Altitude: Story = {
  args: { theme: "altitude", data: SAMPLE_RUN },
};
export const Data: Story = { args: { theme: "data" } };
export const Editorial: Story = {
  args: { theme: "editorial", data: SAMPLE_RUN },
};
export const Triathlon: Story = {
  args: { theme: "triathlon", data: SAMPLE_TRI },
};
