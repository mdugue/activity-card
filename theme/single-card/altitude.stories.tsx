import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_RIDE, SAMPLE_TRI } from "@/components/app/sample-data";
import { type AltitudeConfig, DEFAULT_ALTITUDE_CONFIG } from "@/lib/altitude";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";
import { backgroundArgTypes } from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import {
  activityArgType,
  activityTuningArgTypes,
  colorArgTypes,
  paramArgTypes,
  THEME_PROP_CONTROLS_EXCLUDE,
  type ThemeStoryExtras,
  ThemeStoryView,
} from "../../.storybook/theme-controls";
import { withFormatMatrix } from "../../.storybook/with-format-matrix";
import { ThemeAltitude } from "./altitude";

// Altitude across every export format (the matrix decorator). Beyond its own
// HEADLINE / FONT / POSITION / opacity knobs (generated from ALTITUDE_PARAMS),
// the shared controls let you swap + fine-tune the activity and recolour from
// the preset accents or the photo (Colour control) — `ThemeStoryView` resolves
// it all in render.
const THEME = SINGLE_CARD_THEMES.altitude;

type AltitudeArgs = ComponentProps<typeof ThemeAltitude> &
  ThemeStoryExtras &
  AltitudeConfig;

const meta = preview.type<{ args: AltitudeArgs }>().meta({
  component: ThemeAltitude,
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: THEME_PROP_CONTROLS_EXCLUDE },
  },
  decorators: [withFormatMatrix],
  argTypes: {
    data: activityArgType,
    ...colorArgTypes,
    ...activityTuningArgTypes,
    ...paramArgTypes(THEME.params),
    ...backgroundArgTypes,
  },
  args: {
    color: "Theme default",
    data: SAMPLE_RIDE,
    ...DEFAULT_ALTITUDE_CONFIG,
  },
  render: (args) => <ThemeStoryView args={args} theme={THEME} />,
});

// Altitude renders the activity's location (its hero is the elevation claim);
// asserting it covers more than a blank canvas. The decorator renders one tile
// per format, so assert the first.
const RIDE_PLACE = /Schweiz/i;

export const Default = meta.story({
  play: async ({ canvas }) => {
    const [place] = canvas.getAllByText(RIDE_PLACE);
    await expect(place).toBeVisible();
  },
});

// Config variants — each just flips the relevant flattened param.
export const Serif = meta.story({ args: { font: "serif" } });
export const Stacked = meta.story({ args: { claimStyle: "stacked" } });
export const TopDistance = meta.story({
  args: { claim: "distance", position: "top" },
});
export const NoClaim = meta.story({ args: { claim: "none" } });
export const Triathlon = meta.story({ args: { data: SAMPLE_TRI } });
export const TriathlonStacked = meta.story({
  args: { data: SAMPLE_TRI, claimStyle: "stacked" },
});
export const TriathlonNoClaim = meta.story({
  args: { data: SAMPLE_TRI, claim: "none" },
});
