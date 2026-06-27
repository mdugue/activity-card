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
} from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import { activityArgType } from "../../.storybook/theme-controls";
import { RenderTheme } from "./render-theme";

type RenderThemeArgs = ComponentProps<typeof RenderTheme> & BackgroundArgs;

const meta = preview.type<{ args: RenderThemeArgs }>().meta({
  component: RenderTheme,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { data: activityArgType, ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE },
});

const RIDE_TITLE = /Elbsandstein/;

// The dispatcher must mount the component matching the `theme` id. Asserting the
// title renders under `theme: "path"` proves the right branch was selected and
// handed the data through.
export const Path = meta.story({
  args: { theme: "path" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RIDE_TITLE)).toBeVisible();
  },
});

export const Altitude = meta.story({
  args: { theme: "altitude", data: SAMPLE_RUN },
});
export const Data = meta.story({ args: { theme: "data" } });
export const Editorial = meta.story({
  args: { theme: "editorial", data: SAMPLE_RUN },
});
export const Triathlon = meta.story({
  args: { theme: "triathlon", data: SAMPLE_TRI },
});
