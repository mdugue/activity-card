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

// Multi-mount SVG-id safety — a diagnostic, not a theme.
//
// The carousel mounts the same gradient-defining components MANY times in ONE
// document: the editor preview, the off-screen export node, and (in the app)
// the thumbnail rail all render `CarouselDeck` simultaneously. Every SVG <defs>
// id those components emit must therefore be `useId()`-derived and unique per
// instance — a literal or content-hashed id collides, and a duplicate
// `url(#id)` resolves to the FIRST match in the document, so the second mount
// silently paints with the first's gradient. (This is the bug Altitude already
// guards with `alt-${useId()}`; the carousel's `RouteLine` and `ElevationBand`
// guard it with `useId()` too.)
//
// This story renders two Ascent decks side by side in one document, Dawn beside
// Dusk. Both lead with the elevation signature (`ElevationBand`, whose area
// fill references the per-instance `areaId` gradient), but the ATMOSPHERE param
// gives them DIFFERENT gradient colours. If `areaId` weren't unique per mount,
// the Dusk band would render with the Dawn palette (or vice-versa). Both
// rendering in their own colours is the proof the ids stay isolated — eyeball
// it after any change that touches a carousel SVG <defs>.
type IdSafetyArgs = ComponentProps<typeof CarouselDeck> & BackgroundArgs;

const meta = preview.type<{ args: IdSafetyArgs }>().meta({
  component: CarouselDeck,
  title: "Carousel/Multi-mount id safety",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { data: activityArgType, ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("ascent") },
});

// Two Ascent decks in one document — Dawn beside Dusk. Same `areaId`-defining
// `ElevationBand`, different colours via ATMOSPHERE: proof the per-instance
// `useId()` keeps the two gradients from colliding. Works with or without a
// toolbar background photo (the elevation gradient renders either way).
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
