import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import { ThemeAltitude } from "./altitude";

const meta = {
  component: ThemeAltitude,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RUN },
} satisfies Meta<ComponentProps<typeof ThemeAltitude> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RUN_TITLE = /Westwind/;

// The `mood` prop drives the whole palette/scene — verify the title still
// renders so the smoke covers more than a blank canvas.
export const Night: Story = {
  args: { mood: "night" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RUN_TITLE)).toBeVisible();
  },
};

// Mood variants — render-only, no redundant play.
export const Dawn: Story = { args: { mood: "dawn" } };
export const Day: Story = { args: { mood: "day", data: SAMPLE_RIDE } };
export const Heat: Story = { args: { mood: "heat" } };
export const Rain: Story = { args: { mood: "rain" } };
export const Snow: Story = { args: { mood: "snow" } };
