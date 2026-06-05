import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { DEFAULT_ALTITUDE_CONFIG } from "@/lib/altitude";
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

// Default config — verify the title still renders so the smoke covers more
// than a blank canvas.
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RUN_TITLE)).toBeVisible();
  },
};

// Config variants — render-only, exercising the parametric `AltitudeConfig`.
export const Serif: Story = {
  args: { config: { ...DEFAULT_ALTITUDE_CONFIG, font: "serif" } },
};
export const Stacked: Story = {
  args: { config: { ...DEFAULT_ALTITUDE_CONFIG, claimStyle: "stacked" } },
};
export const TopDistance: Story = {
  args: {
    config: { ...DEFAULT_ALTITUDE_CONFIG, claim: "distance", position: "top" },
  },
};
export const NoClaim: Story = {
  args: { config: { ...DEFAULT_ALTITUDE_CONFIG, claim: null } },
};
export const Ride: Story = { args: { data: SAMPLE_RIDE } };

// Multi-activity project: the bike + run elevation legs overlay on one shared
// scale, the cutout graduating the type's opacity across both seams.
export const Triathlon: Story = { args: { data: SAMPLE_TRI } };
export const TriathlonStacked: Story = {
  args: {
    data: SAMPLE_TRI,
    config: { ...DEFAULT_ALTITUDE_CONFIG, claimStyle: "stacked" },
  },
};
export const TriathlonNoClaim: Story = {
  args: {
    data: SAMPLE_TRI,
    config: { ...DEFAULT_ALTITUDE_CONFIG, claim: null },
  },
};
