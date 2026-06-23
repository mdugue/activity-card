import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { RenderTheme } from "@/components/app/render-theme";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { SINGLE_CARD_THEMES, THEME_ORDER } from "@/components/themes";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import { withFormatMatrix } from "../../../.storybook/with-format-matrix";

// One theme across every export format, switchable live. The `Theme` control
// dispatches `RenderTheme`; the shared matrix decorator fans it out over all
// formats (each tile supplies its own format via context, which `RenderTheme`
// inherits). Switch theme to compare safe-zone behaviour platform-by-platform;
// add a Background photo (toolbar or upload) to see the photo-led themes bleed.
const meta = {
  component: RenderTheme,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  decorators: [withFormatMatrix],
  argTypes: {
    theme: {
      name: "Theme",
      control: { type: "select" },
      options: THEME_ORDER,
      // Map ids → the theme's own label (e.g. "altitude" → "ALTITUDE").
      labels: Object.fromEntries(
        THEME_ORDER.map((id) => [id, SINGLE_CARD_THEMES[id].label])
      ),
    },
    ...backgroundArgTypes,
  },
  args: { data: SAMPLE_RIDE, theme: "altitude" },
} satisfies Meta<ComponentProps<typeof RenderTheme> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Flip the Theme control to compare any theme across all platforms at once.
export const Playground: Story = {};

// A few seeded entry points (each still theme-switchable via Controls).
export const Run: Story = { args: { data: SAMPLE_RUN, theme: "photo" } };
export const Triathlon: Story = {
  args: { data: SAMPLE_TRI, theme: "triathlon" },
};
