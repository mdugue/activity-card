import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";
import { backgroundArgTypes } from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import {
  activityArgType,
  activityTuningArgTypes,
  colorArgTypes,
  THEME_PROP_CONTROLS_EXCLUDE,
  type ThemeStoryExtras,
  ThemeStoryView,
} from "../../.storybook/theme-controls";
import { withFormatMatrix } from "../../.storybook/with-format-matrix";
import { ThemePhoto } from "./photo";

// The photo theme is background-led — pick a Background from the toolbar (or
// upload one) to see it as the magazine-cover hero, then drive its colours from
// the photo via the Colour control. With no photo it falls back to a
// sport-tinted gradient palette.
const THEME = SINGLE_CARD_THEMES.photo;

type PhotoArgs = ComponentProps<typeof ThemePhoto> & ThemeStoryExtras;

const meta = preview.type<{ args: PhotoArgs }>().meta({
  component: ThemePhoto,
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
    ...backgroundArgTypes,
  },
  args: { color: "Theme default", data: SAMPLE_RIDE },
  render: (args) => <ThemeStoryView args={args} theme={THEME} />,
});

const RIDE_TITLE = /Elbsandstein/;

export const Ride = meta.story({
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
});

export const Run = meta.story({ args: { data: SAMPLE_RUN } });
export const Triathlon = meta.story({ args: { data: SAMPLE_TRI } });
