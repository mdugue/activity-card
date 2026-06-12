// Tutorial 1 — Quick start: drop a file (or pull from Strava), add a photo,
// watch the live preview, export. The product's core loop in four steps.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { CardScaled } from "../components/card-showcase";
import { PreloadImg } from "../components/preload-img";
import { RiseIn } from "../components/rise-in";
import { FileChip, Pill } from "../components/stat-chip";
import { ThemeCard } from "../components/theme-card";
import {
  EASE_PANEL,
  FONT,
  PAPER_DIM,
  RADIUS,
  SPACE,
  TYPE,
} from "../design/tokens";
import { OutroScene, StepScene, TitleScene, WALK } from "./walkthrough";

const STEPS = 4;
const STEP_DUR = [200, 200, 220, 200];

export const QUICK_START_DURATION_IN_FRAMES =
  WALK.title +
  STEP_DUR.reduce((a, b) => a + b, 0) +
  WALK.outro -
  WALK.fade * (STEPS + 1);

function DropStep() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: SPACE.md,
      }}
    >
      <RiseIn delay={10}>
        <FileChip label="sunday-ride.gpx" scale={1.2} />
      </RiseIn>
      <RiseIn delay={18}>
        <span
          style={{
            color: PAPER_DIM,
            fontFamily: FONT.mono,
            fontSize: TYPE.caption,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          or
        </span>
      </RiseIn>
      <RiseIn delay={26}>
        <Img
          src={staticFile("strava/btn-connect-with-strava-orange.svg")}
          style={{ display: "block", height: 84 }}
        />
      </RiseIn>
    </div>
  );
}

function PhotoStep() {
  const frame = useCurrentFrame();
  const tilt = interpolate(frame, [10, 40], [-6, -2], {
    easing: EASE_PANEL,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <RiseIn delay={8} distance={26}>
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: RADIUS.md,
          boxShadow: "0 60px 120px -40px rgba(0,0,0,0.65)",
          padding: 18,
          transform: `rotate(${tilt}deg)`,
        }}
      >
        <Img
          src={staticFile("images/ride.jpg")}
          style={{
            borderRadius: RADIUS.sm,
            display: "block",
            height: 520,
            objectFit: "cover",
            width: 390,
          }}
        />
      </div>
    </RiseIn>
  );
}

function PreviewStep({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  // One calm theme flip halfway through — the "live" in live preview.
  const flipAt = Math.floor(durationInFrames / 2);
  const id = frame < flipAt ? "path" : "altitude";
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: SPACE.lg,
      }}
    >
      <PreloadImg src={staticFile("images/ride.jpg")} />
      <RiseIn delay={6}>
        <CardScaled height={height * 0.52}>
          <ThemeCard
            data={SAMPLE_RIDE}
            id={id}
            photoUrl={id === "altitude" ? staticFile("images/ride.jpg") : null}
          />
        </CardScaled>
      </RiseIn>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
        <Pill active={id === "path"}>Path</Pill>
        <Pill active={id === "altitude"}>Altitude</Pill>
      </div>
    </div>
  );
}

function ExportStep() {
  const { height } = useVideoConfig();
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: SPACE.lg,
      }}
    >
      <RiseIn delay={6}>
        <CardScaled height={height * 0.52}>
          <ThemeCard data={SAMPLE_RIDE} id="path" />
        </CardScaled>
      </RiseIn>
      <RiseIn delay={40}>
        <FileChip label="effort_ride_20260518.png" />
      </RiseIn>
    </div>
  );
}

export function FeatureQuickStart() {
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
          blurb="Two steps from workout to share-ready card — no account needed."
          kicker="Tutorial · Quick start"
          lines={["From effort", "to card"]}
        />
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[0]}>
        <StepScene
          label="Drop your activity"
          step={1}
          text="Drag a GPX or .fit file anywhere onto Effort — or connect Strava and pick a recent activity."
          total={STEPS}
        >
          <DropStep />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[1]}>
        <StepScene
          label="Add a photo — optional"
          step={2}
          text="A favourite shot becomes the backdrop. Skip it: every theme works without one."
          total={STEPS}
        >
          <PhotoStep />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[2]}>
        <StepScene
          label="Watch the live preview"
          step={3}
          text="Themes, colours, layout — every change shows up on the card instantly."
          total={STEPS}
        >
          <PreviewStep durationInFrames={STEP_DUR[2]} />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[3]}>
        <StepScene
          label="Export & share"
          step={4}
          text="One tap: a 1080×1350 PNG, sized for Instagram — or share it straight from your phone."
          total={STEPS}
        >
          <ExportStep />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={WALK.outro}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
