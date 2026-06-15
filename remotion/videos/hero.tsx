// The landing-page hero — a cinematic, continuously-moving cut: 3D opening
// claims, any-input→card morph, themes flying in from behind the viewer,
// dramatic recolour, the single-image→carousel reveal, every sport, CTA.
// ~38s at 30fps, 1920×1080. The portrait social cut lives in hero-vertical.tsx
// and reuses these scenes.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { cutSlices } from "../components/cut-slices";
import { FPS, LANDSCAPE } from "../design/tokens";
import {
  CarouselScene,
  ColorScene,
  CtaScene,
  IngestRevealScene,
  OpeningScene,
  SportsScene,
  ThemesScene,
} from "./hero-scenes";

const OPENING = 250;
const INGEST = 200;
const THEMES = 176;
const COLOR = 136;
const CAROUSEL = 180;
const SPORTS = 120;
const CTA = 150;

const CUT = 14;
const FADE = 12;

export const HERO_FPS = FPS;
export const HERO_WIDTH = LANDSCAPE.width;
export const HERO_HEIGHT = LANDSCAPE.height;
export const HERO_DURATION_IN_FRAMES =
  OPENING +
  INGEST +
  THEMES +
  COLOR +
  CAROUSEL +
  SPORTS +
  CTA -
  (CUT + FADE * 5);

export function Hero() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={OPENING}>
        <OpeningScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={cutSlices({ slices: 4 })}
        timing={linearTiming({ durationInFrames: CUT })}
      />
      <TransitionSeries.Sequence durationInFrames={INGEST}>
        <IngestRevealScene durationInFrames={INGEST} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />
      <TransitionSeries.Sequence durationInFrames={THEMES}>
        <ThemesScene durationInFrames={THEMES} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />
      <TransitionSeries.Sequence durationInFrames={COLOR}>
        <ColorScene durationInFrames={COLOR} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />
      <TransitionSeries.Sequence durationInFrames={CAROUSEL}>
        <CarouselScene durationInFrames={CAROUSEL} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />
      <TransitionSeries.Sequence durationInFrames={SPORTS}>
        <SportsScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE })}
      />
      <TransitionSeries.Sequence durationInFrames={CTA}>
        <CtaScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
