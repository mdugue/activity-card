// Tutorial 4 — Photos & palettes: the photo backdrop, colour schemes pulled
// from the shot, and the filter/grain treatments.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { NO_EFFECTS } from "@/lib/photo-effects";
import type { ColorScheme } from "@/theme/core/colors";
import { PhotoFxProvider } from "@/theme/shared/photo-fx";
import { CardScaled } from "../components/card-showcase";
import { PreloadImg } from "../components/preload-img";
import { PaletteChip, Pill } from "../components/stat-chip";
import { ThemeCard } from "../components/theme-card";
import { SPACE } from "../design/tokens";
import { OutroScene, StepScene, TitleScene, WALK } from "./walkthrough";

const STEPS = 3;
const STEP_DUR = [240, 260, 260];
const RIDE_PHOTO = "images/ride.jpg";
// Natural size of ride.jpg — the cover layer is sized against it.
const RIDE_SIZE = { h: 3301, w: 2200 };

export const PHOTOS_DURATION_IN_FRAMES =
  WALK.title +
  STEP_DUR.reduce((a, b) => a + b, 0) +
  WALK.outro -
  WALK.fade * (STEPS + 1);

// Step 1 — the same card without, then with the photo backdrop.
function BackdropStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const flipAt = Math.floor(durationInFrames * 0.4);
  const withPhoto = frame >= flipAt;
  const opacity = interpolate(frame, [flipAt, flipAt + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: SPACE.lg,
      }}
    >
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <div style={{ position: "relative" }}>
        <CardScaled height={height * 0.56}>
          <ThemeCard data={SAMPLE_RIDE} id="altitude" />
        </CardScaled>
        <div style={{ inset: 0, opacity, position: "absolute" }}>
          <CardScaled height={height * 0.56}>
            <ThemeCard
              data={SAMPLE_RIDE}
              id="altitude"
              photoUrl={staticFile(RIDE_PHOTO)}
            />
          </CardScaled>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
        <Pill active={!withPhoto}>No photo</Pill>
        <Pill active={withPhoto}>Photo backdrop</Pill>
      </div>
    </div>
  );
}

// Step 2 — the five photo-derived palette variants recolour the card.
const VARIANT_BEATS: { label: string; scheme: ColorScheme }[] = [
  { label: "Vibrant", scheme: { primary: "#e0683a" } },
  { label: "Muted", scheme: { primary: "#a98352" } },
  { label: "Complement", scheme: { primary: "#2f6f86" } },
  { label: "Spectrum", scheme: { primary: "#b1281a", secondary: "#1d3a2e" } },
  { label: "Pure", scheme: { primary: "#f7f3ec" } },
];

function PaletteStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const step = Math.floor(durationInFrames / VARIANT_BEATS.length);
  const active = Math.min(VARIANT_BEATS.length - 1, Math.floor(frame / step));
  const beat = VARIANT_BEATS[active];
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: SPACE.lg,
      }}
    >
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <CardScaled height={height * 0.56}>
        <ThemeCard
          colors={beat.scheme}
          data={SAMPLE_RIDE}
          id="altitude"
          photoUrl={staticFile(RIDE_PHOTO)}
        />
      </CardScaled>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
        {VARIANT_BEATS.map((b, i) => (
          <PaletteChip
            active={i === active}
            colors={[b.scheme.primary, b.scheme.secondary ?? "#1f1a16"]}
            key={b.label}
            label={b.label}
          />
        ))}
      </div>
    </div>
  );
}

// Step 3 — filter presets + grain, via the same context the app provides.
const FILTER_BEATS = [
  { filter: "none", grain: false, label: "Original" },
  { filter: "warm", grain: false, label: "Warm" },
  { filter: "noir", grain: false, label: "Noir" },
  { filter: "mono", grain: true, label: "Mono + grain" },
];

function FiltersStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const step = Math.floor(durationInFrames / FILTER_BEATS.length);
  const active = Math.min(FILTER_BEATS.length - 1, Math.floor(frame / step));
  const beat = FILTER_BEATS[active];
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: SPACE.lg,
      }}
    >
      <PreloadImg src={staticFile(RIDE_PHOTO)} />
      <PhotoFxProvider
        value={{
          effects: { ...NO_EFFECTS, filter: beat.filter, grain: beat.grain },
          imageSize: RIDE_SIZE,
        }}
      >
        <CardScaled height={height * 0.56}>
          <ThemeCard
            data={SAMPLE_RIDE}
            id="altitude"
            photoUrl={staticFile(RIDE_PHOTO)}
          />
        </CardScaled>
      </PhotoFxProvider>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
        {FILTER_BEATS.map((b, i) => (
          <Pill active={i === active} key={b.label}>
            {b.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}

export function FeaturePhotos() {
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
          blurb="Drop a favourite shot behind your card — Effort colours around it."
          kicker="Tutorial · Photos & palettes"
          lines={["Your photo,", "your palette"]}
        />
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[0]}>
        <StepScene
          label="Set the scene"
          step={1}
          text="Any photo-capable theme puts your shot full-bleed behind the layout."
          total={STEPS}
        >
          <BackdropStep durationInFrames={STEP_DUR[0]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[1]}>
        <StepScene
          label="Palettes from the photo"
          step={2}
          text="Effort extracts colour schemes from the image — vibrant, muted, complementary, spectrum, or pure."
          total={STEPS}
        >
          <PaletteStep durationInFrames={STEP_DUR[1]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[2]}>
        <StepScene
          label="Filters & grain"
          step={3}
          text="Finish the shot with a preset — and analogue grain that survives export."
          total={STEPS}
        >
          <FiltersStep durationInFrames={STEP_DUR[2]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={WALK.outro}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
