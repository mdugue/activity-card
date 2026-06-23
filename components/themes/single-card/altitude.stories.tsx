import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_RIDE, SAMPLE_TRI } from "@/components/app/sample-data";
import {
  ALTITUDE_PARAMS,
  type AltitudeConfig,
  DEFAULT_ALTITUDE_CONFIG,
} from "@/lib/altitude";
import { coerceConfig } from "@/lib/params/resolve";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import preview from "../../../.storybook/preview";
import {
  activityArgType,
  paramArgTypes,
  THEME_PROP_CONTROLS_EXCLUDE,
} from "../../../.storybook/theme-controls";
import { withFormatMatrix } from "../../../.storybook/with-format-matrix";
import { ThemeAltitude } from "./altitude";

// Every variant renders across all export formats (the shared matrix decorator),
// and each `AltitudeConfig` knob is a real, typed control (HEADLINE / FONT /
// POSITION dropdowns, a CUTOUT OPACITY slider, a toggle) generated from the
// theme's own `ALTITUDE_PARAMS`. The flattened knobs widen the component's args;
// `render` recombines them into `config` via `coerceConfig`.
type AltitudeArgs = ComponentProps<typeof ThemeAltitude> &
  BackgroundArgs &
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
    ...paramArgTypes(ALTITUDE_PARAMS),
    ...backgroundArgTypes,
  },
  args: { data: SAMPLE_RIDE, ...DEFAULT_ALTITUDE_CONFIG },
  render: (args) => (
    <ThemeAltitude
      config={coerceConfig(DEFAULT_ALTITUDE_CONFIG, ALTITUDE_PARAMS, args)}
      data={args.data}
      photoUrl={args.photoUrl ?? null}
    />
  ),
});

const RIDE_TITLE = /Elbsandstein/;

// Default config — verify the title still renders so the smoke covers more than
// a blank canvas. The decorator renders one tile per format, so assert the first.
export const Default = meta.story({
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
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
