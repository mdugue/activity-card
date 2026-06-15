import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { DEFAULT_ALTITUDE_CONFIG } from "@/lib/altitude";
import type { ColorScheme } from "@/lib/colors";
import { IDENTITY_TRANSFORM } from "@/lib/image-transform";
import { NO_EFFECTS } from "@/lib/photo-effects";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import { ExportSheet } from "./export-sheet";
import { SAMPLE_RIDE } from "./sample-data";

const COLORS: ColorScheme = { primary: "#c45a2c", secondary: "#1d3a2e" };

const noop = () => {
  // story stub
};

const meta = {
  component: ExportSheet,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
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
    theme: "altitude",
  },
} satisfies Meta<ComponentProps<typeof ExportSheet> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const PosterTheme: Story = { args: { theme: "data" } };
