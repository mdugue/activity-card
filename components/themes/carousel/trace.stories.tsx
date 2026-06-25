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
import preview from "../../../.storybook/preview";
import { activityArgType } from "../../../.storybook/theme-controls";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Trace — the route silhouette is the spanning signature, an art-print on warm
// paper (Dawn) or after dark (Dusk) via the ATMOSPHERE param. One
// `CarouselDeck` paints the whole n×1080 × 1350 strip; pick a Background from
// the toolbar (or upload one) to see the theme over a photo.
const meta = preview
  .type<{ args: ComponentProps<typeof CarouselDeck> & BackgroundArgs }>()
  .meta({
    component: CarouselDeck,
    title: "Carousel/Trace",
    tags: ["ai-generated"],
    parameters: { layout: "fullscreen" },
    argTypes: { data: activityArgType, ...backgroundArgTypes },
    args: { data: SAMPLE_RIDE, ...carouselArgs("trace") },
  });

const RIDE_TITLE = /Elbsandstein/;

// Smoke check: the activity title reaches the deck (it can appear on several
// slides, so assert at least one and that it's visible).
export const Dawn = meta.story({
  play: async ({ canvas }) => {
    const titles = canvas.getAllByText(RIDE_TITLE);
    expect(titles.length).toBeGreaterThan(0);
    await expect(titles[0]).toBeVisible();
  },
});

// The ATMOSPHERE param swaps the deck onto the dusk look (palette + type).
export const Dusk = meta.story({ args: { config: { atmosphere: "dusk" } } });

// Multi-activity project: every leg's route overlays in the spanning signature.
export const DawnTriathlon = meta.story({ args: { data: SAMPLE_TRI } });
// Two-leg brick (bike + a small run) — checks both legs survive in the route.
export const DawnBrick = meta.story({ args: { data: SAMPLE_BRICK } });
