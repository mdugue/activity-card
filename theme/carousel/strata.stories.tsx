import type { ComponentProps } from "react";
import { SAMPLE_RIDE, SAMPLE_TRI } from "@/components/app/sample-data";
import { DEFAULT_STRATA_CONFIG } from "@/lib/strata";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import { activityArgType } from "../../.storybook/theme-controls";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Strata — the generative woven morph-field is the spanning signature: the route
// ridge runs along the top, the elevation ridge along the bottom, the
// abstraction fills the middle, and the swipe walks across the whole topography.
// Mood / density / legend come from the theme's config (mood swaps the whole
// palette via the theme's `resolveStyle`); a few presets below.
const meta = preview
  .type<{ args: ComponentProps<typeof CarouselDeck> & BackgroundArgs }>()
  .meta({
    component: CarouselDeck,
    title: "Carousel/Strata",
    tags: ["ai-generated"],
    parameters: { layout: "fullscreen" },
    argTypes: { data: activityArgType, ...backgroundArgTypes },
    args: {
      data: SAMPLE_RIDE,
      ...carouselArgs("strata"),
      config: DEFAULT_STRATA_CONFIG,
    },
  });

export const Default = meta.story({ args: { data: SAMPLE_RIDE } });
export const Paper = meta.story({
  args: { config: { mood: "paper", density: "fine", legend: true } },
});
export const MidnightClean = meta.story({
  args: { config: { mood: "midnight", density: "bold", legend: false } },
});
// Multi-activity project: the woven field draws from every leg's route +
// elevation.
export const Triathlon = meta.story({ args: { data: SAMPLE_TRI } });
