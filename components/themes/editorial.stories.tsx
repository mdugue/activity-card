import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import { ThemeEditorial } from "./editorial";

const meta = {
  component: ThemeEditorial,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ThemeEditorial>;

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
