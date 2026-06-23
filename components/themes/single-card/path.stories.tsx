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
import { ThemePath } from "./path";

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
    <ThemePath
      data={ACTIVITY_SAMPLES[args.activity]}
      photoUrl={args.photoUrl ?? null}
    />
  ),
} satisfies Meta<ThemeStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Smoke check — the activity title (a prop) must reach the DOM. One play is
// enough for the file; the variants below just re-render with other fixtures.
export const Ride: Story = {
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
};

export const Run: Story = { args: { activity: "Run" } };
export const Swim: Story = { args: { activity: "Swim" } };
export const Triathlon: Story = { args: { activity: "Triathlon" } };
