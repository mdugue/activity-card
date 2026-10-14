import type { ComponentProps } from "react";
import { expect } from "storybook/test";

import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { DEFAULT_WINDOW_CONFIG } from "@/lib/woven-themes";
import type { WindowConfig } from "@/lib/woven-themes";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";

import { backgroundArgTypes } from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import {
  activityArgType,
  activityTuningArgTypes,
  colorArgTypes,
  paramArgTypes,
  THEME_PROP_CONTROLS_EXCLUDE,
  ThemeStoryView,
} from "../../.storybook/theme-controls";
import type {
  ParamArgs,
  ThemeStoryExtras,
} from "../../.storybook/theme-controls";
import { withFormatMatrix } from "../../.storybook/with-format-matrix";
import { ThemeWindow } from "./window";

// WINDOW across every export format. It is photo-led, so the stories open on
// a background (trackRunners); switch it in the toolbar or upload your own. METRICS
// steps the numbers from none (the Strava default) up to labelled values.
const THEME = SINGLE_CARD_THEMES.window;

type Args = ComponentProps<typeof ThemeWindow> &
  ThemeStoryExtras &
  ParamArgs<WindowConfig>;

const meta = preview.type<{ args: Args }>().meta({
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
    ...DEFAULT_WINDOW_CONFIG,
  },
  component: ThemeWindow,
  decorators: [withFormatMatrix],
  globals: { background: "trackRunners" },
  parameters: {
    controls: { exclude: THEME_PROP_CONTROLS_EXCLUDE },
    layout: "fullscreen",
  },
  render: (args) => <ThemeStoryView args={args} theme={THEME} />,
  tags: ["ai-generated"],
});

const RIDE_TITLE = /Elbsandstein/u;

export const Default = meta.story({
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeInTheDocument();
  },
});
export const MetricsOff = meta.story({ args: { metrics: "off" } });
export const MetricsFull = meta.story({ args: { metrics: "full" } });
export const Run = meta.story({ args: { data: SAMPLE_RUN } });
export const Triathlon = meta.story({ args: { data: SAMPLE_TRI } });
export const NoPhoto = meta.story({ globals: { background: "none" } });
/** DARKEN off: the photo as shot, type kept readable by a soft scrim. */
export const PhotoAsShot = meta.story({ args: { dim: 0 } });
/** The graphic moved and scaled (what the editor's Adjust → Graphic sets). */
export const GraphicPlaced = meta.story({
  args: { artScale: 70, artX: 12, artY: -14 },
});
