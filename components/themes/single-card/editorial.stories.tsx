import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { SINGLE_CARD_THEMES } from "@/components/themes";
import { backgroundArgTypes } from "../../../.storybook/backgrounds";
import preview from "../../../.storybook/preview";
import {
  activityArgType,
  activityTuningArgTypes,
  colorArgTypes,
  THEME_PROP_CONTROLS_EXCLUDE,
  type ThemeStoryExtras,
  ThemeStoryView,
} from "../../../.storybook/theme-controls";
import { withFormatMatrix } from "../../../.storybook/with-format-matrix";
import { ThemeEditorial } from "./editorial";

const THEME = SINGLE_CARD_THEMES.editorial;

type EditorialArgs = ComponentProps<typeof ThemeEditorial> & ThemeStoryExtras;

const meta = preview.type<{ args: EditorialArgs }>().meta({
  component: ThemeEditorial,
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
  args: { color: "Theme default", data: SAMPLE_RUN },
  render: (args) => <ThemeStoryView args={args} theme={THEME} />,
});

const RUN_TITLE = /Westwind/;

// Typography-led layout — the title is the hero, so assert it landed.
export const Run = meta.story({
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RUN_TITLE);
    await expect(title).toBeVisible();
  },
});

export const Ride = meta.story({ args: { data: SAMPLE_RIDE } });
export const Triathlon = meta.story({ args: { data: SAMPLE_TRI } });
