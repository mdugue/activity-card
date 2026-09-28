import type { ComponentProps } from "react";

import { SAMPLE_RIDE } from "@/components/app/sample-data";

import { backgroundArgTypes } from "../../.storybook/backgrounds";
import type { BackgroundArgs } from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import { activityArgType } from "../../.storybook/theme-controls";
import { CarouselDeck } from "./deck";
import { carouselArgs } from "./story-support";

// Multi-mount SVG-id safety — a diagnostic. The carousel mounts the same
// gradient-defining components many times in one document (preview + export node
// + thumbnails), so every SVG <defs> id must be `useId()`-derived. This renders
// two Ascent decks (Dawn beside Dusk) whose ATMOSPHERE gives the same
// `ElevationBand` gradient DIFFERENT colours: both painting in their own colour
// proves the per-instance ids don't collide. Eyeball after touching any <defs>.
type IdSafetyArgs = ComponentProps<typeof CarouselDeck> & BackgroundArgs;

const meta = preview.type<{ args: IdSafetyArgs }>().meta({
  argTypes: { data: activityArgType, ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("ascent") },
  component: CarouselDeck,
  parameters: { layout: "fullscreen" },
  tags: ["ai-generated"],
  title: "Carousel/Multi-mount id safety",
});

export const TwoUp = meta.story({
  render: (args) => {
    const base = carouselArgs("ascent");
    const shared = {
      ...base,
      data: args.data,
      imageSize: args.imageSize,
      photoEffects: args.photoEffects,
      photoUrl: args.photoUrl,
    };
    return (
      <div style={{ alignItems: "flex-start", display: "flex", gap: 32 }}>
        <CarouselDeck {...shared} config={{ atmosphere: "dawn" }} />
        <CarouselDeck {...shared} config={{ atmosphere: "dusk" }} />
      </div>
    );
  },
});
