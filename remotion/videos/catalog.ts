// The feature-video catalogue — one row per walkthrough, the single source
// for Studio/CLI registration (remotion/root.tsx) AND the /tutorials page.
// Add a new tutorial here and it shows up in both.

import type { FC } from "react";
import { FPS, LANDSCAPE } from "../design/tokens";
import {
  CAROUSEL_DURATION_IN_FRAMES,
  FeatureCarousel,
} from "./feature-carousel";
import { FeaturePhotos, PHOTOS_DURATION_IN_FRAMES } from "./feature-photos";
import {
  FeatureQuickStart,
  QUICK_START_DURATION_IN_FRAMES,
} from "./feature-quick-start";
import { FeatureSports, SPORTS_DURATION_IN_FRAMES } from "./feature-sports";
import { FeatureThemes, THEMES_DURATION_IN_FRAMES } from "./feature-themes";

export interface FeatureVideo {
  /** tutorials-page teaser copy */
  blurb: string;
  component: FC;
  durationInFrames: number;
  fps: number;
  height: number;
  /** the Remotion composition id (render with `bun run video:render <id>`) */
  id: string;
  /** rust overline on the tutorials page */
  kicker: string;
  title: string;
  width: number;
}

const BASE = {
  fps: FPS,
  height: LANDSCAPE.height,
  width: LANDSCAPE.width,
} as const;

export const FEATURE_VIDEOS: FeatureVideo[] = [
  {
    ...BASE,
    blurb:
      "Drop a GPX or .fit file — or pull an activity from Strava — add a photo, and export a share-ready card. The whole loop in under a minute.",
    component: FeatureQuickStart,
    durationInFrames: QUICK_START_DURATION_IN_FRAMES,
    id: "FeatureQuickStart",
    kicker: "Quick start",
    title: "From effort to card",
  },
  {
    ...BASE,
    blurb:
      "The default mode: your activity becomes one seamless wide image, sliced into swipeable 4:5 slides on export.",
    component: FeatureCarousel,
    durationInFrames: CAROUSEL_DURATION_IN_FRAMES,
    id: "FeatureCarousel",
    kicker: "Carousel mode",
    title: "One story, many slides",
  },
  {
    ...BASE,
    blurb:
      "Seven single-card posters, six carousel looks, and per-theme knobs like Strata's mood — pick the look that fits the day.",
    component: FeatureThemes,
    durationInFrames: THEMES_DURATION_IN_FRAMES,
    id: "FeatureThemes",
    kicker: "Themes",
    title: "Pick your look",
  },
  {
    ...BASE,
    blurb:
      "Put a favourite shot behind the card, pull a palette straight out of it, and finish with filters and analogue grain.",
    component: FeaturePhotos,
    durationInFrames: PHOTOS_DURATION_IN_FRAMES,
    id: "FeaturePhotos",
    kicker: "Photos & palettes",
    title: "Your photo, your palette",
  },
  {
    ...BASE,
    blurb:
      "Rides, runs, swims, and triathlons each surface their own metrics — pace, power, SWOLF, splits — on a faithful route.",
    component: FeatureSports,
    durationInFrames: SPORTS_DURATION_IN_FRAMES,
    id: "FeatureSports",
    kicker: "Sports",
    title: "The right numbers, every sport",
  },
];
