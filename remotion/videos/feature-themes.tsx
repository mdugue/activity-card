// Tutorial 3 — Themes: the seven single-card posters, the six carousel
// looks, and per-theme knobs (Strata's mood) — pick the look that fits.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { SINGLE_CARD_THEMES, THEME_ORDER } from "@/components/themes";
import { CarouselDeck } from "@/components/themes/carousel/deck";
import {
  CAROUSEL_THEMES,
  type CarouselThemeId,
} from "@/components/themes/carousel/registry";
import { carouselArgs } from "@/components/themes/carousel/story-support";
import type { StrataMood } from "@/lib/strata";
import { CardScaled, StripPan } from "../components/card-showcase";
import { PreloadImg } from "../components/preload-img";
import { Pill } from "../components/stat-chip";
import { ThemeCard } from "../components/theme-card";
import { DUR, EASE_PANEL, SAFE, SPACE } from "../design/tokens";
import { OutroScene, StepScene, TitleScene, WALK } from "./walkthrough";

const STEPS = 3;
const STEP_DUR = [360, 300, 300];

export const THEMES_DURATION_IN_FRAMES =
  WALK.title +
  STEP_DUR.reduce((a, b) => a + b, 0) +
  WALK.outro -
  WALK.fade * (STEPS + 1);

// Step 1 — flip through every single-card poster, name pills in sync.
function PostersStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const step = Math.floor(durationInFrames / THEME_ORDER.length);
  const active = Math.min(THEME_ORDER.length - 1, Math.floor(frame / step));
  const id = THEME_ORDER[active];
  const local = frame - active * step;
  const slide = interpolate(local, [0, DUR.fast], [30, 0], {
    easing: EASE_PANEL,
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(local, [0, DUR.fast], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <>
      <PreloadImg src={staticFile("images/ride.jpg")} />
      <div style={{ opacity, transform: `translateX(${slide}px)` }}>
        <CardScaled height={height * 0.56}>
          <ThemeCard
            data={SAMPLE_RIDE}
            id={id}
            photoUrl={
              id === "altitude" || id === "photo"
                ? staticFile("images/ride.jpg")
                : undefined
            }
          />
        </CardScaled>
      </div>
      <div
        style={{
          bottom: SAFE + 134,
          display: "flex",
          gap: SPACE.xs,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
        }}
      >
        {THEME_ORDER.map((themeId, i) => (
          <Pill active={i === active} key={themeId}>
            {SINGLE_CARD_THEMES[themeId].label}
          </Pill>
        ))}
      </div>
    </>
  );
}

// Step 2 — the carousel looks, one deck pan per theme.
const DECK_TOUR: CarouselThemeId[] = ["trace", "press", "frame"];

function DecksStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const step = Math.floor(durationInFrames / DECK_TOUR.length);
  const active = Math.min(DECK_TOUR.length - 1, Math.floor(frame / step));
  const id = DECK_TOUR[active];
  const local = frame - active * step;
  const theme = CAROUSEL_THEMES[id];
  const slideCount = theme.panels.length;
  const stripHeight = height * 0.54;
  const scale = stripHeight / 1350;
  const panTo = Math.max(0, slideCount * 1080 - width / scale);
  const progress = interpolate(local, [0, step], [0.1, 0.55], {
    easing: EASE_PANEL,
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(local, [0, DUR.fast], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: SPACE.sm,
        opacity,
      }}
    >
      <StripPan
        height={stripHeight}
        panFrom={0}
        panTo={panTo}
        progress={progress}
        slideCount={slideCount}
        style={{
          boxShadow: "0 60px 120px -40px rgba(0,0,0,0.65)",
          width: width * 0.92,
        }}
      >
        <CarouselDeck data={SAMPLE_RIDE} {...carouselArgs(id)} />
      </StripPan>
      <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.sm }}>
        {DECK_TOUR.map((themeId, i) => (
          <Pill active={i === active} key={themeId}>
            {CAROUSEL_THEMES[themeId].label}
          </Pill>
        ))}
      </div>
    </div>
  );
}

// Step 3 — a per-theme knob: Strata's mood reweaves the field.
const MOODS: { label: string; mood: StrataMood }[] = [
  { label: "Dusk", mood: "dusk" },
  { label: "Dawn", mood: "dawn" },
  { label: "Alpine", mood: "alpine" },
  { label: "Midnight", mood: "midnight" },
  { label: "Paper", mood: "paper" },
];

function MoodStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const step = Math.floor(durationInFrames / MOODS.length);
  const active = Math.min(MOODS.length - 1, Math.floor(frame / step));
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: SPACE.lg,
      }}
    >
      <CardScaled height={height * 0.56}>
        <ThemeCard
          config={{ mood: MOODS[active].mood }}
          data={SAMPLE_RIDE}
          id="strata"
        />
      </CardScaled>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
        {MOODS.map((m, i) => (
          <Pill active={i === active} key={m.mood}>
            {m.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}

export function FeatureThemes() {
  const t = (
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: WALK.fade })}
    />
  );
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={WALK.title}>
        <TitleScene
          blurb="Seven single-card posters and six carousel looks — all from the same drop."
          kicker="Tutorial · Themes"
          lines={["Pick", "your look"]}
        />
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[0]}>
        <StepScene
          label="Seven posters"
          step={1}
          text="Single-card mode: one 1080×1350 poster per look — photo-led, generative, editorial, or data-dense."
          total={STEPS}
        >
          <PostersStep durationInFrames={STEP_DUR[0]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[1]}>
        <StepScene
          label="Six carousels"
          step={2}
          text="Carousel mode has its own theme family — art-print, broadsheet, ultra-minimal, and more."
          total={STEPS}
        >
          <DecksStep durationInFrames={STEP_DUR[1]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[2]}>
        <StepScene
          label="Turn the knobs"
          step={3}
          text="Themes bring their own parameters — Strata's mood reweaves the whole generative field."
          total={STEPS}
        >
          <MoodStep durationInFrames={STEP_DUR[2]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={WALK.outro}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
