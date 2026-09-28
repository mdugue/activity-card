// The landing-page hero — a cinematic, continuously-moving cut: 3D opening
// claims, any-input→card morph, themes flying in from behind the viewer,
// dramatic recolour, the single-image→carousel reveal, every sport, CTA.
// ~38s at 30fps, 1920×1080. The portrait social cut lives in hero-vertical.tsx
// and reuses these scenes.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

import { cutSlices } from "../components/cut-slices";
import {
  HERO_BEATS as BEAT,
  HERO_TRANSITIONS as TRANSITION,
} from "./hero-meta";
import {
  CarouselScene,
  ColorScene,
  CtaScene,
  IngestRevealScene,
  OpeningScene,
  SportsScene,
  ThemesScene,
} from "./hero-scenes";

export const Hero = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={BEAT.opening}>
      <OpeningScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={cutSlices({ slices: 4 })}
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
