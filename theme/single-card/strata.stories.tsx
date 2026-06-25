import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { DEFAULT_STRATA_CONFIG, type StrataConfig } from "@/lib/strata";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";
import { backgroundArgTypes } from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import {
  activityArgType,
  activityTuningArgTypes,
  colorArgTypes,
  paramArgTypes,
  THEME_PROP_CONTROLS_EXCLUDE,
  type ThemeStoryExtras,
  ThemeStoryView,
} from "../../.storybook/theme-controls";
import { withFormatMatrix } from "../../.storybook/with-format-matrix";
import { ThemeStrata } from "./strata";

// STRATA across every export format, with its ATMOSPHERE / DENSITY / legend
// knobs plus the shared activity + colour controls. A background photo is
// optional — pick one to preview the field over a photo (and to enable the
// photo-derived Colour options).
const THEME = SINGLE_CARD_THEMES.strata;

type StrataArgs = ComponentProps<typeof ThemeStrata> &
  ThemeStoryExtras &
  StrataConfig;

const meta = preview.type<{ args: StrataArgs }>().meta({
  component: ThemeStrata,
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
    ...paramArgTypes(THEME.params),
    ...backgroundArgTypes,
  },
  args: { color: "Theme default", data: SAMPLE_RIDE, ...DEFAULT_STRATA_CONFIG },
  render: (args) => <ThemeStoryView args={args} theme={THEME} />,
});

const RIDE_TITLE = /Elbsandstein/;

// Default (Dusk · Woven · legend on). One play is enough for the file; the
// variants below re-render with other moods / densities / fixtures.
export const Default = meta.story({
  play: async ({ canvas }) => {
    const [title] = canvas.getAllByText(RIDE_TITLE);
    await expect(title).toBeVisible();
  },
});

// The five moods — each retunes the gradient and the two highlight colours.
export const Paper = meta.story({ args: { mood: "paper" } });
export const Dawn = meta.story({ args: { mood: "dawn" } });
export const Midnight = meta.story({ args: { mood: "midnight" } });
export const Alpine = meta.story({ args: { mood: "alpine" } });

// Density — how finely the route is woven down into the profile.
export const Fine = meta.story({ args: { density: "fine" } });
export const Bold = meta.story({ args: { density: "bold" } });

// Pure abstraction — the cartographic captions removed.
export const NoLegend = meta.story({ args: { legend: false } });

// Any sport: a run blends into pace, a swim into lap pace, a project (triathlon)
// weaves every leg's route and profile into one continuous field.
export const Run = meta.story({ args: { data: SAMPLE_RUN, mood: "dawn" } });
export const Swim = meta.story({
  args: { data: SAMPLE_SWIM, mood: "midnight" },
});
export const Triathlon = meta.story({
  args: { data: SAMPLE_TRI, mood: "alpine" },
});
