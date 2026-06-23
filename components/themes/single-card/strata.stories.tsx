import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { coerceConfig } from "@/lib/params/resolve";
import {
  DEFAULT_STRATA_CONFIG,
  STRATA_PARAMS,
  type StrataConfig,
} from "@/lib/strata";
import { backgroundArgTypes } from "../../../.storybook/backgrounds";
import {
  ACTIVITY_SAMPLES,
  activityArgType,
  INJECTED_CONTROLS_EXCLUDE,
  paramArgTypes,
  type ThemeStoryArgs,
} from "../../../.storybook/theme-controls";
import { withFormatMatrix } from "../../../.storybook/with-format-matrix";
import { ThemeStrata } from "./strata";

// STRATA across every export format (the shared matrix decorator), with its
// ATMOSPHERE / DENSITY / legend knobs as real controls generated from
// `STRATA_PARAMS`. A background photo is optional — pick one to preview the
// field over a photo with its mood-tinted scrim.
type StrataArgs = ThemeStoryArgs & StrataConfig;

const meta = {
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: INJECTED_CONTROLS_EXCLUDE },
  },
  decorators: [withFormatMatrix],
  argTypes: {
    activity: activityArgType,
    ...paramArgTypes(STRATA_PARAMS),
    ...backgroundArgTypes,
  },
  args: { activity: "Ride", ...DEFAULT_STRATA_CONFIG },
  render: (args) => (
    <ThemeStrata
      config={coerceConfig(DEFAULT_STRATA_CONFIG, STRATA_PARAMS, args)}
      data={ACTIVITY_SAMPLES[args.activity]}
      photoUrl={args.photoUrl ?? null}
    />
  ),
} satisfies Meta<StrataArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Default (Dusk · Woven · legend on). One play is enough for the file; the
// variants below re-render with other moods / densities / fixtures.
export const Default: Story = {
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
};

// The five moods — each retunes the gradient and the two highlight colours.
export const Paper: Story = { args: { mood: "paper" } };
export const Dawn: Story = { args: { mood: "dawn" } };
export const Midnight: Story = { args: { mood: "midnight" } };
export const Alpine: Story = { args: { mood: "alpine" } };

// Density — how finely the route is woven down into the profile.
export const Fine: Story = { args: { density: "fine" } };
export const Bold: Story = { args: { density: "bold" } };

// Pure abstraction — the cartographic captions removed.
export const NoLegend: Story = { args: { legend: false } };

// Any sport: a run blends into pace, a swim into lap pace, a project (triathlon)
// weaves every leg's route and profile into one continuous field.
export const Run: Story = { args: { activity: "Run", mood: "dawn" } };
export const Swim: Story = { args: { activity: "Swim", mood: "midnight" } };
export const Triathlon: Story = {
  args: { activity: "Triathlon", mood: "alpine" },
};
