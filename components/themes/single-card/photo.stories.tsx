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
import { ThemePhoto } from "./photo";

// The photo theme is background-led — pick a Background from the toolbar (or
// upload one) to see it as the magazine-cover hero. With no photo it falls back
// to a sport-tinted gradient palette.
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
    <ThemePhoto
      data={ACTIVITY_SAMPLES[args.activity]}
      photoUrl={args.photoUrl ?? null}
    />
  ),
} satisfies Meta<ThemeStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

export const Ride: Story = {
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
};

export const Run: Story = { args: { activity: "Run" } };
export const Triathlon: Story = { args: { activity: "Triathlon" } };
