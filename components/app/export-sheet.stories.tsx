import type { ComponentProps } from "react";

import { DEFAULT_ALTITUDE_CONFIG } from "@/lib/altitude";
import { IDENTITY_TRANSFORM } from "@/lib/image-transform";
import { NO_EFFECTS } from "@/lib/photo-effects";
import type { ColorScheme } from "@/theme/core/colors";
import { THEME_ORDER } from "@/theme/single-card";

import { backgroundArgTypes } from "../../.storybook/backgrounds";
import type { BackgroundArgs } from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import { ExportSheet } from "./export-sheet";
import { SAMPLE_RIDE } from "./sample-data";

const COLORS: ColorScheme = { primary: "#c45a2c", secondary: "#1d3a2e" };

const noop = () => {
  // story stub
};

const meta = preview
  .type<{ args: ComponentProps<typeof ExportSheet> & BackgroundArgs }>()
  .meta({
    argTypes: {
      theme: {
        control: { type: "select" },
        name: "Theme",
        options: THEME_ORDER,
      },
      ...backgroundArgTypes,
    },
    args: {
      colors: COLORS,
      config: DEFAULT_ALTITUDE_CONFIG,
      data: SAMPLE_RIDE,
      imageTransform: IDENTITY_TRANSFORM,
      onKeepEditing: noop,
      onNew: noop,
      photoBackdropEnabled: true,
      photoEffects: NO_EFFECTS,
      photoUrl: null,
      routeCoordinates: SAMPLE_RIDE.routeCoordinates,
    },
    component: ExportSheet,
    parameters: { layout: "fullscreen" },
    tags: ["ai-generated"],
  });

export const Default = meta.story({ args: { theme: "altitude" } });
export const PosterTheme = meta.story({ args: { theme: "data" } });
