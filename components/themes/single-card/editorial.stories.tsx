import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { backgroundArgTypes } from "../../../.storybook/backgrounds";
import {
  ACTIVITY_SAMPLES,
  activityArgType,
  INJECTED_CONTROLS_EXCLUDE,
  type ThemeStoryArgs,
} from "../../../.storybook/theme-controls";
import { withFormatMatrix } from "../../../.storybook/with-format-matrix";
import { ThemeEditorial } from "./editorial";

const meta = {
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: INJECTED_CONTROLS_EXCLUDE },
  },
  decorators: [withFormatMatrix],
  argTypes: { activity: activityArgType, ...backgroundArgTypes },
  args: { activity: "Run" },
  render: (args) => (
    <ThemeEditorial
      data={ACTIVITY_SAMPLES[args.activity]}
      photoUrl={args.photoUrl ?? null}
    />
  ),
} satisfies Meta<ThemeStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RUN_TITLE = /Westwind/;

// Typography-led layout — the title is the hero, so assert it landed.
export const Run: Story = {
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RUN_TITLE);
    await expect(title).toBeVisible();
  },
};

export const Ride: Story = { args: { activity: "Ride" } };
export const Triathlon: Story = { args: { activity: "Triathlon" } };
