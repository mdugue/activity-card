// The portrait social cut of the hero (1080×1920) — the same scenes, tighter.
// ~31s at 30fps.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { cutSlices } from "../components/cut-slices";
import { FPS, PORTRAIT } from "../design/tokens";
import {
  CarouselScene,
  ColorScene,
  CtaScene,
  IngestRevealScene,
  OpeningScene,
  SportsScene,
  ThemesScene,
} from "./hero-scenes";

const OPENING = 230;
const INGEST = 180;
const THEMES = 160;
const COLOR = 120;
const CAROUSEL = 165;
const SPORTS = 104;
const CTA = 140;

const CUT = 9;
const FADE = 7;

export const HERO_VERTICAL_FPS = FPS;
export const HERO_VERTICAL_WIDTH = PORTRAIT.width;
export const HERO_VERTICAL_HEIGHT = PORTRAIT.height;
export const HERO_VERTICAL_DURATION_IN_FRAMES =
  OPENING +
  INGEST +
  THEMES +
  COLOR +
  CAROUSEL +
  SPORTS +
  CTA -
  (CUT + FADE * 5);

export function HeroVertical() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={OPENING}>
        <OpeningScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={cutSlices({ slices: 3 })}
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
