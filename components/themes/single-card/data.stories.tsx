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
import { ThemeData } from "./data";

const meta = {
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: INJECTED_CONTROLS_EXCLUDE },
  },
  decorators: [withFormatMatrix],
  argTypes: { activity: activityArgType, ...backgroundArgTypes },
  args: { activity: "Ride" },
  render: (args) => (
    <ThemeData
      data={ACTIVITY_SAMPLES[args.activity]}
      photoUrl={args.photoUrl ?? null}
    />
  ),
} satisfies Meta<ThemeStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Dashboard poster — confirm the title prop renders amongst the dense grid.
export const Ride: Story = {
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
};

export const Run: Story = { args: { activity: "Run" } };
export const Triathlon: Story = { args: { activity: "Triathlon" } };
