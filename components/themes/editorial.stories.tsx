import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import { ThemeEditorial } from "./editorial";

const meta = {
  component: ThemeEditorial,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
} satisfies Meta<ComponentProps<typeof ThemeEditorial> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RUN_TITLE = /Westwind/;

// Typography-led layout — the title is the hero, so assert it landed.
export const Run: Story = {
  args: { data: SAMPLE_RUN },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RUN_TITLE)).toBeVisible();
  },
};

export const Ride: Story = { args: { data: SAMPLE_RIDE } };
