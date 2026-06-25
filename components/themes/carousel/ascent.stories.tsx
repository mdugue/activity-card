import type { ComponentProps } from "react";
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

// Ascent — the elevation profile is the spanning signature, a mountain-range
// portrait along the bottom of the strip at first light (Dawn) or after dark
// (Dusk) via the ATMOSPHERE param. The elevation viz follows the
// (user-adjustable) accent.
type AscentArgs = ComponentProps<typeof CarouselDeck> & BackgroundArgs;

const meta = preview.type<{ args: AscentArgs }>().meta({
  component: CarouselDeck,
  title: "Carousel/Ascent",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { data: activityArgType, ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("ascent") },
});

export const Dawn = meta.story({ args: { data: SAMPLE_RIDE } });
// The ATMOSPHERE param swaps the deck onto the dusk look (palette + type).
export const Dusk = meta.story({ args: { config: { atmosphere: "dusk" } } });

// Multi-activity project: each leg's profile lays side by side on a shared,
// distance-weighted scale in the elevation signature.
export const DawnTriathlon = meta.story({ args: { data: SAMPLE_TRI } });
export const DawnBrick = meta.story({ args: { data: SAMPLE_BRICK } });
