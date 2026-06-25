import type { ComponentProps } from "react";
import { SAMPLE_BRICK, SAMPLE_RIDE } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import { activityArgType } from "../../.storybook/theme-controls";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Press — editorial broadsheet: masthead + serif headline with a drop cap, stat
// pull-quotes, print-style route/altitude cuts, a closing byline. Type-led, so
// no spanning signature and no veil — text sits in opaque "clipping" boxes.
const meta = preview
  .type<{ args: ComponentProps<typeof CarouselDeck> & BackgroundArgs }>()
  .meta({
    component: CarouselDeck,
    title: "Carousel/Press",
    tags: ["ai-generated"],
    parameters: { layout: "fullscreen" },
    argTypes: { data: activityArgType, ...backgroundArgTypes },
    args: { data: SAMPLE_RIDE, ...carouselArgs("press") },
  });

export const Default = meta.story({ args: { data: SAMPLE_RIDE } });
export const Brick = meta.story({ args: { data: SAMPLE_BRICK } });
