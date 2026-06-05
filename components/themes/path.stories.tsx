import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { ThemePath } from "./path";

const meta = {
  component: ThemePath,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ThemePath>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Smoke check — the activity title (a prop) must reach the DOM. One play is
// enough for the file; the variants below just re-render with other fixtures.
export const Ride: Story = {
  args: { data: SAMPLE_RIDE },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RIDE_TITLE)).toBeVisible();
  },
};

export const Run: Story = { args: { data: SAMPLE_RUN } };
export const Swim: Story = { args: { data: SAMPLE_SWIM } };
export const Triathlon: Story = { args: { data: SAMPLE_TRI } };
