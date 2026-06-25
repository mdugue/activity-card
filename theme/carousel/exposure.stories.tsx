import type { ComponentProps } from "react";
import {
  SAMPLE_BRICK,
  SAMPLE_RIDE,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import { activityArgType } from "../../.storybook/theme-controls";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Exposure — no spanning signature: the full-bleed photo is the hero, with a
// magazine masthead and the route + elevation as small detail graphics. Defaults
// to the photo-derived palette, so pick a Background to see it come alive.
const meta = preview
  .type<{ args: ComponentProps<typeof CarouselDeck> & BackgroundArgs }>()
  .meta({
    component: CarouselDeck,
    title: "Carousel/Exposure",
    tags: ["ai-generated"],
    parameters: { layout: "fullscreen" },
    argTypes: { data: activityArgType, ...backgroundArgTypes },
    args: { data: SAMPLE_RIDE, ...carouselArgs("exposure") },
  });

export const Default = meta.story({ args: { data: SAMPLE_RIDE } });
export const Triathlon = meta.story({ args: { data: SAMPLE_TRI } });
export const Brick = meta.story({ args: { data: SAMPLE_BRICK } });
