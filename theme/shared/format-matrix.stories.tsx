import type { ComponentProps } from "react";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { RenderTheme } from "@/theme/editor/render-theme";
import {
  SINGLE_CARD_THEMES,
  THEME_ORDER,
  type ThemeId,
} from "@/theme/single-card";
import { backgroundArgTypes } from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import {
  activityArgType,
  activityTuningArgTypes,
  colorArgTypes,
  type ThemeStoryExtras,
  useStoryThemeProps,
} from "../../.storybook/theme-controls";
import { withFormatMatrix } from "../../.storybook/with-format-matrix";

// One theme across every export format, switchable live. The `Theme` control
// dispatches `RenderTheme`; the shared activity + colour controls resolve against
// the SELECTED theme (its default scheme / params). Flip the `Safe zones` toolbar
// toggle to see each format's keep-out guides.
type FormatMatrixArgs = ComponentProps<typeof RenderTheme> & ThemeStoryExtras;

function FormatMatrixView({
  args,
}: {
  args: ThemeStoryExtras & { data: unknown; theme: ThemeId };
}) {
  const { colors, config, data, photoUrl } = useStoryThemeProps(
    args,
    SINGLE_CARD_THEMES[args.theme]
  );
  return (
    <RenderTheme
      colors={colors}
      config={config}
      data={data}
      photoUrl={photoUrl}
      theme={args.theme}
    />
  );
}

const meta = preview.type<{ args: FormatMatrixArgs }>().meta({
  component: RenderTheme,
  tags: ["ai-generated"],
  parameters: {
    layout: "fullscreen",
    controls: {
      exclude: [
        "format",
        "config",
        "colors",
        "imageTransform",
        "photoEffects",
        "photoBackdropEnabled",
        "photoUrl",
        "imageSize",
      ],
    },
  },
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
    data: activityArgType,
    ...colorArgTypes,
    ...activityTuningArgTypes,
    ...backgroundArgTypes,
  },
  args: { color: "Theme default", data: SAMPLE_RIDE, theme: "altitude" },
  render: (args) => <FormatMatrixView args={args} />,
});

// Flip the Theme control to compare any theme across all platforms at once.
export const Playground = meta.story({
  args: { data: SAMPLE_RIDE, theme: "altitude" },
});

// A few seeded entry points (each still theme-switchable via Controls).
export const Run = meta.story({ args: { data: SAMPLE_RUN, theme: "photo" } });
export const Triathlon = meta.story({
  args: { data: SAMPLE_TRI, theme: "triathlon" },
});
