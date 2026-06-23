import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  ALTITUDE_PARAMS,
  type AltitudeConfig,
  DEFAULT_ALTITUDE_CONFIG,
} from "@/lib/altitude";
import { coerceConfig } from "@/lib/params/resolve";
import { backgroundArgTypes } from "../../../.storybook/backgrounds";
import {
  ACTIVITY_SAMPLES,
  activityArgType,
  INJECTED_CONTROLS_EXCLUDE,
  paramArgTypes,
  type ThemeStoryArgs,
} from "../../../.storybook/theme-controls";
import { withFormatMatrix } from "../../../.storybook/with-format-matrix";
import { ThemeAltitude } from "./altitude";

// Every variant renders across all export formats (the shared matrix decorator),
// and each `AltitudeConfig` knob is a real, typed control (HEADLINE / FONT /
// POSITION dropdowns, a CUTOUT OPACITY slider, a toggle) generated from the
// theme's own `ALTITUDE_PARAMS`. `render` resolves the Activity fixture and
// recombines the knobs into `config` via `coerceConfig`.
type AltitudeArgs = ThemeStoryArgs & AltitudeConfig;

const meta = {
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: INJECTED_CONTROLS_EXCLUDE },
  },
  decorators: [withFormatMatrix],
  argTypes: {
    activity: activityArgType,
    ...paramArgTypes(ALTITUDE_PARAMS),
    ...backgroundArgTypes,
  },
  args: { activity: "Ride", ...DEFAULT_ALTITUDE_CONFIG },
  render: (args) => (
    <ThemeAltitude
      config={coerceConfig(DEFAULT_ALTITUDE_CONFIG, ALTITUDE_PARAMS, args)}
      data={ACTIVITY_SAMPLES[args.activity]}
      photoUrl={args.photoUrl ?? null}
    />
  ),
} satisfies Meta<AltitudeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Default config — verify the title still renders so the smoke covers more than
// a blank canvas. The decorator renders one tile per format, so assert the first.
export const Default: Story = {
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
};

// Config variants — each just flips the relevant flattened param.
export const Serif: Story = { args: { font: "serif" } };
export const Stacked: Story = { args: { claimStyle: "stacked" } };
export const TopDistance: Story = {
  args: { claim: "distance", position: "top" },
};
export const NoClaim: Story = { args: { claim: "none" } };
export const Triathlon: Story = { args: { activity: "Triathlon" } };
export const TriathlonStacked: Story = {
  args: { activity: "Triathlon", claimStyle: "stacked" },
};
export const TriathlonNoClaim: Story = {
  args: { activity: "Triathlon", claim: "none" },
};
