import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_BRICK, SAMPLE_TRI } from "@/components/app/sample-data";
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
import { ThemeTriathlon } from "./triathlon";

type TriathlonArgs = ComponentProps<typeof ThemeTriathlon> & BackgroundArgs;

const meta = preview.type<{ args: TriathlonArgs }>().meta({
  component: ThemeTriathlon,
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: THEME_PROP_CONTROLS_EXCLUDE },
  },
  decorators: [withFormatMatrix],
  // Only the multi-sport fixtures have segments; the others render nothing.
  argTypes: {
    data: { ...activityArgType, options: ["Triathlon", "Brick"] },
    ...backgroundArgTypes,
  },
  args: { data: SAMPLE_TRI },
});

const TRI_TITLE = /Lanzarote/;

// Multi-sport card — only renders when segments are present; the title proves
// the segmented fixture was accepted and the card mounted.
export const Default = meta.story({
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(TRI_TITLE);
    await expect(title).toBeVisible();
  },
});

export const Brick = meta.story({ args: { data: SAMPLE_BRICK } });
