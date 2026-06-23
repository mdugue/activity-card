import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import preview from "../../../.storybook/preview";
import {
  activityArgType,
  THEME_PROP_CONTROLS_EXCLUDE,
} from "../../../.storybook/theme-controls";
import { withFormatMatrix } from "../../../.storybook/with-format-matrix";
import { ThemePhoto } from "./photo";

type PhotoArgs = ComponentProps<typeof ThemePhoto> & BackgroundArgs;

// The photo theme is background-led — pick a Background from the toolbar (or
// upload one) to see it as the magazine-cover hero. With no photo it falls back
// to a sport-tinted gradient palette.
const meta = preview.type<{ args: PhotoArgs }>().meta({
  component: ThemePhoto,
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: THEME_PROP_CONTROLS_EXCLUDE },
  },
  decorators: [withFormatMatrix],
  argTypes: { data: activityArgType, ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE },
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
