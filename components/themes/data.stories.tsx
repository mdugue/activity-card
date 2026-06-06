import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { ThemeData } from "./data";

const meta = {
  component: ThemeData,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ThemeData>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Dashboard poster — confirm the title prop renders amongst the dense grid.
export const Ride: Story = {
  args: { data: SAMPLE_RIDE },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RIDE_TITLE)).toBeVisible();
  },
};

export const Run: Story = { args: { data: SAMPLE_RUN } };
export const Triathlon: Story = { args: { data: SAMPLE_TRI } };
