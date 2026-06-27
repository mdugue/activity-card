import type { ComponentProps } from "react";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
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
  component: CarouselDeck,
  title: "Carousel/Multi-mount id safety",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { data: activityArgType, ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("ascent") },
});

export const TwoUp = meta.story({
  render: (args) => {
    const base = carouselArgs("ascent");
    const shared = {
      ...base,
      data: args.data,
      photoUrl: args.photoUrl,
      imageSize: args.imageSize,
      photoEffects: args.photoEffects,
    };
    return (
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        <CarouselDeck {...shared} config={{ atmosphere: "dawn" }} />
        <CarouselDeck {...shared} config={{ atmosphere: "dusk" }} />
      </div>
    );
  },
});
