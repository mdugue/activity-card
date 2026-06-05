import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import { ThemePhoto } from "./photo";

// The photo theme is background-led — pick a Background from the toolbar (or
// upload one) to see it as the magazine-cover hero. With no photo it falls back
// to a sport-tinted gradient palette.
const meta = {
  component: ThemePhoto,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
} satisfies Meta<ComponentProps<typeof ThemePhoto> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

export const Ride: Story = {
  args: { data: SAMPLE_RIDE },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RIDE_TITLE)).toBeVisible();
  },
};

export const Run: Story = { args: { data: SAMPLE_RUN } };
