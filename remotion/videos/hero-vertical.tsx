// The portrait social cut of the hero (1080×1920) — same scenes, tighter
// pacing, the problem beat dropped. ~28s at 30fps.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { cutSlices } from "../components/cut-slices";
import { FPS, PORTRAIT } from "../design/tokens";
import {
  CardRevealScene,
  CtaScene,
  HookScene,
  IngestScene,
  MontageCarouselScene,
  MontagePaletteScene,
  MontageSportsScene,
  MontageThemesScene,
} from "./hero-scenes";

const HOOK = 100;
const INGEST = 115;
const REVEAL = 115;
const THEMES = 110;
const PALETTE = 105;
const CAROUSEL = 120;
const SPORTS = 100;
const CTA = 140;

const CUT = 14;
const SLIDE = 10;
const FADE = 12;

export const HERO_VERTICAL_FPS = FPS;
export const HERO_VERTICAL_WIDTH = PORTRAIT.width;
export const HERO_VERTICAL_HEIGHT = PORTRAIT.height;
export const HERO_VERTICAL_DURATION_IN_FRAMES =
  HOOK +
  INGEST +
  REVEAL +
  THEMES +
  PALETTE +
  CAROUSEL +
  SPORTS +
  CTA -
  (CUT * 2 + SLIDE * 4 + FADE);

export function HeroVertical() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={HOOK}>
        <HookScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={cutSlices({ slices: 3 })}
        timing={linearTiming({ durationInFrames: CUT })}
      />
      <TransitionSeries.Sequence durationInFrames={INGEST}>
        <IngestScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={cutSlices({ slices: 3 })}
        timing={linearTiming({ durationInFrames: CUT })}
      />
      <TransitionSeries.Sequence durationInFrames={REVEAL}>
        <CardRevealScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: SLIDE })}
      />
      <TransitionSeries.Sequence durationInFrames={THEMES}>
        <MontageThemesScene durationInFrames={THEMES} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: SLIDE })}
      />
      <TransitionSeries.Sequence durationInFrames={PALETTE}>
        <MontagePaletteScene durationInFrames={PALETTE} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: SLIDE })}
      />
      <TransitionSeries.Sequence durationInFrames={CAROUSEL}>
        <MontageCarouselScene durationInFrames={CAROUSEL} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: SLIDE })}
      />
      <TransitionSeries.Sequence durationInFrames={SPORTS}>
        <MontageSportsScene />
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
