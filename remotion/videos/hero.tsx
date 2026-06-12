// The landing-page hero — fast, marketing-style: hook, problem, solution,
// feature montage, CTA. ~34s at 30fps, 1920×1080. The portrait social cut
// lives in hero-vertical.tsx and reuses these scenes.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { cutSlices } from "../components/cut-slices";
import { FPS, LANDSCAPE } from "../design/tokens";
import {
  CardRevealScene,
  CtaScene,
  HookScene,
  IngestScene,
  MontageCarouselScene,
  MontagePaletteScene,
  MontageSportsScene,
  MontageThemesScene,
  ProblemScene,
} from "./hero-scenes";

const HOOK = 110;
const PROBLEM = 130;
const INGEST = 120;
const REVEAL = 120;
const THEMES = 120;
const PALETTE = 115;
const CAROUSEL = 130;
const SPORTS = 110;
const CTA = 150;

const CUT = 14;
const SLIDE = 10;
const FADE = 12;

export const HERO_FPS = FPS;
export const HERO_WIDTH = LANDSCAPE.width;
export const HERO_HEIGHT = LANDSCAPE.height;
export const HERO_DURATION_IN_FRAMES =
  HOOK +
  PROBLEM +
  INGEST +
  REVEAL +
  THEMES +
  PALETTE +
  CAROUSEL +
  SPORTS +
  CTA -
  (CUT * 3 + SLIDE * 4 + FADE);

export function Hero() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={HOOK}>
        <HookScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={cutSlices({ slices: 4 })}
        timing={linearTiming({ durationInFrames: CUT })}
      />
      <TransitionSeries.Sequence durationInFrames={PROBLEM}>
        <ProblemScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={cutSlices({ slices: 4 })}
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
