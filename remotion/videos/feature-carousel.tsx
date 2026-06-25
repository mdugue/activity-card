// Tutorial 2 — Carousel mode: the seamless strip, how it slices into slides,
// and a theme knob (Trace's atmosphere) restyling the whole deck.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { CarouselDeck } from "@/components/themes/carousel/deck";
import {
  CAROUSEL_THEMES,
  type CarouselThemeId,
} from "@/components/themes/carousel/registry";
import { carouselArgs } from "@/components/themes/carousel/story-support";
import { StripPan } from "../components/card-showcase";
import { PreloadImg } from "../components/preload-img";
import { Pill } from "../components/stat-chip";
import { EASE_PANEL, SPACE } from "../design/tokens";
import { OutroScene, StepScene, TitleScene, WALK } from "./walkthrough";

const STEPS = 3;
const STEP_DUR = [260, 240, 240];
const DUNES_SIZE = { h: 2400, w: 1600 };

export const CAROUSEL_DURATION_IN_FRAMES =
  WALK.title +
  STEP_DUR.reduce((a, b) => a + b, 0) +
  WALK.outro -
  WALK.fade * (STEPS + 1);

function DeckPan({
  config,
  durationInFrames,
  id,
  photo = false,
  showSeams = false,
}: {
  config?: Record<string, unknown>;
  durationInFrames: number;
  id: CarouselThemeId;
  photo?: boolean;
  showSeams?: boolean;
}) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const theme = CAROUSEL_THEMES[id];
  const slideCount = theme.panels.length;
  const stripHeight = height * 0.62;
  const scale = stripHeight / 1350;
  const panTo = Math.max(0, slideCount * 1080 - width / scale);
  const progress = interpolate(frame, [10, durationInFrames - 10], [0, 1], {
    easing: EASE_PANEL,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <>
      {photo ? <PreloadImg src={staticFile("images/dunes.webp")} /> : null}
      <StripPan
        height={stripHeight}
        panFrom={0}
        panTo={panTo}
        progress={progress}
        showSeams={showSeams}
        slideCount={slideCount}
        style={{
          boxShadow: "0 60px 120px -40px rgba(0,0,0,0.65)",
          width,
        }}
      >
        <CarouselDeck
          data={SAMPLE_RIDE}
          {...carouselArgs(id)}
          config={config}
          imageSize={photo ? DUNES_SIZE : null}
          photoUrl={photo ? staticFile("images/dunes.webp") : null}
        />
      </StripPan>
    </>
  );
}

// The atmosphere knob: the same Trace deck, Dawn for the first half, Dusk for
// the second — with the pills calling the switch.
function AtmosphereStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const flipAt = Math.floor(durationInFrames / 2);
  const dusk = frame >= flipAt;
  const theme = CAROUSEL_THEMES.trace;
  const slideCount = theme.panels.length;
  const stripHeight = height * 0.56;
  const scale = stripHeight / 1350;
  const panTo = Math.max(0, slideCount * 1080 - width / scale);
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: SPACE.sm,
      }}
    >
      <StripPan
        height={stripHeight}
        panFrom={panTo * 0.3}
        panTo={panTo * 0.3}
        progress={0}
        slideCount={slideCount}
        style={{
          boxShadow: "0 60px 120px -40px rgba(0,0,0,0.65)",
          width: width * 0.86,
        }}
      >
        <CarouselDeck
          data={SAMPLE_RIDE}
          {...carouselArgs("trace")}
          config={{ atmosphere: dusk ? "dusk" : "dawn" }}
        />
      </StripPan>
      <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.sm }}>
        <Pill active={!dusk}>Dawn</Pill>
        <Pill active={dusk}>Dusk</Pill>
      </div>
    </div>
  );
}

export function FeatureCarousel() {
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
          blurb="The default mode: your whole activity as one wide image, exported as a swipeable set of slides."
          kicker="Tutorial · Carousel mode"
          lines={["One story,", "many slides"]}
        />
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[0]}>
        <StepScene
          label="One seamless image"
          step={1}
          text="Your route, elevation, and numbers span a single wide canvas — no slide-by-slide layouts."
          total={STEPS}
        >
          <DeckPan durationInFrames={STEP_DUR[0]} id="trace" />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[1]}>
        <StepScene
          label="Sliced into slides"
          step={2}
          text="On export the strip is cut into tidy 1080×1350 slides — a photo can bleed across every edge."
          total={STEPS}
        >
          <DeckPan
            durationInFrames={STEP_DUR[1]}
            id="exposure"
            photo
            showSeams
          />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[2]}>
        <StepScene
          label="Turn the knobs"
          step={3}
          text="Theme parameters restyle the whole deck at once — Trace swings from Dawn to Dusk."
          total={STEPS}
        >
          <AtmosphereStep durationInFrames={STEP_DUR[2]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={WALK.outro}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
