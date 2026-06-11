import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import {
  SAMPLE_BRICK,
  SAMPLE_RIDE,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Trace — the route silhouette is the spanning signature, an art-print on warm
// paper (Dawn) or after dark (Dusk) via the ATMOSPHERE param. One
// `CarouselDeck` paints the whole n×1080 × 1350 strip; pick a Background from
// the toolbar (or upload one) to see the theme over a photo.
const meta = {
  component: CarouselDeck,
  title: "Carousel/Trace",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("trace") },
} satisfies Meta<ComponentProps<typeof CarouselDeck> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const RIDE_TITLE = /Elbsandstein/;

// Smoke check: the activity title reaches the deck (it can appear on several
// slides, so assert at least one and that it's visible).
export const Dawn: Story = {
  play: async ({ canvas }) => {
    const titles = canvas.getAllByText(RIDE_TITLE);
    expect(titles.length).toBeGreaterThan(0);
    await expect(titles[0]).toBeVisible();
  },
};

// The ATMOSPHERE param swaps the deck onto the dusk look (palette + type).
export const Dusk: Story = { args: { config: { atmosphere: "dusk" } } };

// Multi-activity project: every leg's route overlays in the spanning signature.
export const DawnTriathlon: Story = { args: { data: SAMPLE_TRI } };
// Two-leg brick (bike + a small run) — checks both legs survive in the route.
export const DawnBrick: Story = { args: { data: SAMPLE_BRICK } };
