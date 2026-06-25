import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
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
import { ThemePath } from "./path";

const THEME = SINGLE_CARD_THEMES.path;

type PathArgs = ComponentProps<typeof ThemePath> & ThemeStoryExtras;

const meta = preview.type<{ args: PathArgs }>().meta({
  component: ThemePath,
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

// Smoke check — the activity title (a prop) must reach the DOM. One play is
// enough for the file; the variants below just re-render with other fixtures.
export const Ride = meta.story({
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
});

export const Run = meta.story({ args: { data: SAMPLE_RUN } });
export const Swim = meta.story({ args: { data: SAMPLE_SWIM } });
export const Triathlon = meta.story({ args: { data: SAMPLE_TRI } });
