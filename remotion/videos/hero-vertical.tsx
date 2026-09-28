// The portrait social cut of the hero (1080×1920) — the same scenes, tighter.
// ~31s at 30fps.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

import { cutSlices } from "../components/cut-slices";
import {
  CarouselScene,
  ColorScene,
  CtaScene,
  IngestRevealScene,
  OpeningScene,
  SportsScene,
  ThemesScene,
} from "./hero-scenes";
import {
  HERO_VERTICAL_BEATS as BEAT,
  HERO_VERTICAL_TRANSITIONS as TRANSITION,
} from "./hero-vertical-meta";

export const HeroVertical = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={BEAT.opening}>
      <OpeningScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={cutSlices({ slices: 3 })}
      timing={linearTiming({ durationInFrames: TRANSITION.cut })}
    />
    <TransitionSeries.Sequence durationInFrames={BEAT.ingest}>
      <IngestRevealScene durationInFrames={BEAT.ingest} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: TRANSITION.fade })}
    />
    <TransitionSeries.Sequence durationInFrames={BEAT.themes}>
      <ThemesScene durationInFrames={BEAT.themes} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: TRANSITION.fade })}
    />
    <TransitionSeries.Sequence durationInFrames={BEAT.color}>
      <ColorScene durationInFrames={BEAT.color} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: TRANSITION.fade })}
    />
    <TransitionSeries.Sequence durationInFrames={BEAT.carousel}>
      <CarouselScene durationInFrames={BEAT.carousel} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: TRANSITION.fade })}
    />
    <TransitionSeries.Sequence durationInFrames={BEAT.sports}>
      <SportsScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: TRANSITION.fade })}
    />
    <TransitionSeries.Sequence durationInFrames={BEAT.cta}>
      <CtaScene />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
