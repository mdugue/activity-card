import type { ComponentProps } from "react";
import { SAMPLE_BRICK, SAMPLE_RIDE } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";
import preview from "../../../.storybook/preview";
import { activityArgType } from "../../../.storybook/theme-controls";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Frame — ultra-minimal, type-led: one big datum + its sparkline per slide
// between hairline rules, four beats. No spanning signature and no veil; the
// panels protect their own text with shadows.
const meta = preview
  .type<{ args: ComponentProps<typeof CarouselDeck> & BackgroundArgs }>()
  .meta({
    component: CarouselDeck,
    title: "Carousel/Frame",
    tags: ["ai-generated"],
    parameters: { layout: "fullscreen" },
    argTypes: { data: activityArgType, ...backgroundArgTypes },
    args: { data: SAMPLE_RIDE, ...carouselArgs("frame") },
  });

export const Default = meta.story({ args: { data: SAMPLE_RIDE } });
export const Brick = meta.story({ args: { data: SAMPLE_BRICK } });
