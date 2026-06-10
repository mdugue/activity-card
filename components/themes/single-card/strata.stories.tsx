import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { DEFAULT_STRATA_CONFIG } from "@/lib/strata";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import { ThemeStrata } from "./strata";

// STRATA is generative, but a background photo is optional: pick one from the
// Background toolbar (or upload via the per-story control) to preview the field
// over a photo with its mood-tinted scrim.
const meta = {
  component: ThemeStrata,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE },
} satisfies Meta<ComponentProps<typeof ThemeStrata> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Default (Dusk · Woven · legend on). One play is enough for the file; the
// variants below re-render with other moods / densities / fixtures.
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RIDE_TITLE)).toBeVisible();
  },
};

// The five moods — each retunes the gradient and the two highlight colours.
export const Paper: Story = {
  args: { config: { ...DEFAULT_STRATA_CONFIG, mood: "paper" } },
};
export const Dawn: Story = {
  args: { config: { ...DEFAULT_STRATA_CONFIG, mood: "dawn" } },
};
export const Midnight: Story = {
  args: { config: { ...DEFAULT_STRATA_CONFIG, mood: "midnight" } },
};
export const Alpine: Story = {
  args: { config: { ...DEFAULT_STRATA_CONFIG, mood: "alpine" } },
};

// Density — how finely the route is woven down into the profile.
export const Fine: Story = {
  args: { config: { ...DEFAULT_STRATA_CONFIG, density: "fine" } },
};
export const Bold: Story = {
  args: { config: { ...DEFAULT_STRATA_CONFIG, density: "bold" } },
};

// Pure abstraction — the cartographic captions removed.
export const NoLegend: Story = {
  args: { config: { ...DEFAULT_STRATA_CONFIG, legend: false } },
};

// Any sport: a run blends into pace, a swim into lap pace, a project (triathlon)
// weaves every leg's route and profile into one continuous field.
export const Run: Story = {
  args: {
    data: SAMPLE_RUN,
    config: { ...DEFAULT_STRATA_CONFIG, mood: "dawn" },
  },
};
export const Swim: Story = {
  args: {
    data: SAMPLE_SWIM,
    config: { ...DEFAULT_STRATA_CONFIG, mood: "midnight" },
  },
};
export const Triathlon: Story = {
  args: {
    data: SAMPLE_TRI,
    config: { ...DEFAULT_STRATA_CONFIG, mood: "alpine" },
  },
};
