import type { ComponentProps } from "react";
import { DEFAULT_ALTITUDE_CONFIG } from "@/lib/altitude";
import { IDENTITY_TRANSFORM } from "@/lib/image-transform";
import { NO_EFFECTS } from "@/lib/photo-effects";
import type { ColorScheme } from "@/theme/core/colors";
import { THEME_ORDER } from "@/theme/single-card";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
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
    component: ExportSheet,
    tags: ["ai-generated"],
    parameters: { layout: "fullscreen" },
    argTypes: {
      theme: {
        name: "Theme",
        control: { type: "select" },
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
  });

export const Default = meta.story({ args: { theme: "altitude" } });
export const PosterTheme = meta.story({ args: { theme: "data" } });
