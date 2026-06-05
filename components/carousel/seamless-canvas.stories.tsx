import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import {
  CAROUSEL_THEME_TOKENS,
  type CarouselThemeId,
} from "@/lib/carousel/theme-tokens";
import { buildDeck } from "@/lib/carousel/types";
import { NO_EFFECTS } from "@/lib/photo-effects";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import { SeamlessCanvas } from "./seamless-canvas";

// The carousel ("accordion") themes share one renderer — SeamlessCanvas paints
// the whole n×1080 × 1350 strip. Each story below is a different CarouselThemeId,
// rendered with that theme's fixed deck, accent and default photo look. Pick a
// Background from the toolbar (or upload one via the Background control) to see
// any theme over a photo.
const meta = {
  component: SeamlessCanvas,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE },
} satisfies Meta<ComponentProps<typeof SeamlessCanvas> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

/** A theme's static args: its fixed deck, own accent, and default photo filter
 *  + grain (the look the app applies when that theme is chosen). */
function themeArgs(theme: CarouselThemeId) {
  const tokens = CAROUSEL_THEME_TOKENS[theme];
  return {
    theme,
    slides: buildDeck(tokens.deck),
    accent: tokens.accent,
    photoEffects: {
      ...NO_EFFECTS,
      filter: tokens.defaultFilter,
      grain: tokens.defaultGrain,
    },
  };
}

// Smoke check on the first theme — the activity title reaches the deck. (It can
// appear on several slides, so assert at least one and that it's visible.) Other
// themes are render-only: SeamlessCanvas throws on a bad deck/profile, so the
// render is the assertion.
export const TraceDawn: Story = {
  args: themeArgs("traceDawn"),
  play: async ({ canvas }) => {
    const titles = canvas.getAllByText(RIDE_TITLE);
    expect(titles.length).toBeGreaterThan(0);
    await expect(titles[0]).toBeVisible();
  },
};

export const TraceDusk: Story = { args: themeArgs("traceDusk") };
export const AscentDawn: Story = { args: themeArgs("ascentDawn") };
export const AscentDusk: Story = { args: themeArgs("ascentDusk") };
export const Exposure: Story = { args: themeArgs("exposure") };
export const Frame: Story = { args: themeArgs("frame") };
export const Press: Story = { args: themeArgs("press") };
