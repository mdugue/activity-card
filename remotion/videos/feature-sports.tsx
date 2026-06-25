// Tutorial 5 — Built for your sport: ride, run, swim, and triathlon each get
// their own metrics, with the route and elevation always geographically true.

import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useVideoConfig } from "remotion";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import type { ActivityData } from "@/lib/activity";
import type { ThemeId } from "@/theme/single-card";
import { CardScaled } from "../components/card-showcase";
import { RiseIn } from "../components/rise-in";
import { Pill } from "../components/stat-chip";
import { ThemeCard } from "../components/theme-card";
import { SPACE } from "../design/tokens";
import { OutroScene, StepScene, TitleScene, WALK } from "./walkthrough";

const STEPS = 4;
const STEP_DUR = [220, 220, 220, 220];

export const SPORTS_DURATION_IN_FRAMES =
  WALK.title +
  STEP_DUR.reduce((a, b) => a + b, 0) +
  WALK.outro -
  WALK.fade * (STEPS + 1);

// One sport beat: the real card plus the metrics that sport surfaces.
function SportStep({
  data,
  id,
  metrics,
}: {
  data: ActivityData;
  id: ThemeId;
  metrics: string[];
}) {
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
      <RiseIn delay={4}>
        <CardScaled height={height * 0.56}>
          <ThemeCard data={data} id={id} />
        </CardScaled>
      </RiseIn>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
        {metrics.map((m, i) => (
          <RiseIn delay={16 + i * 5} key={m}>
            <Pill active={i === 0}>{m}</Pill>
          </RiseIn>
        ))}
      </div>
    </div>
  );
}

export function FeatureSports() {
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
          blurb="Effort reads the sport from your file and surfaces the numbers that matter for it."
          kicker="Tutorial · Sports"
          lines={["The right numbers,", "every sport"]}
        />
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[0]}>
        <StepScene
          label="Rides"
          step={1}
          text="Cycling cards lead with speed — plus power, VAM, and cadence when your file carries them."
          total={STEPS}
        >
          <SportStep
            data={SAMPLE_RIDE}
            id="path"
            metrics={["Avg speed", "Power", "VAM", "Cadence"]}
          />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[1]}>
        <StepScene
          label="Runs"
          step={2}
          text="Running speaks in pace — min/km, per-kilometre splits, and heart rate."
          total={STEPS}
        >
          <SportStep
            data={SAMPLE_RUN}
            id="editorial"
            metrics={["Pace", "Splits", "Heart rate"]}
          />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[2]}>
        <StepScene
          label="Swims"
          step={3}
          text="Swims get pace per 100 m, SWOLF, and lap-by-lap detail."
          total={STEPS}
        >
          <SportStep
            data={SAMPLE_SWIM}
            id="data"
            metrics={["Pace /100m", "SWOLF", "Laps"]}
          />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={STEP_DUR[3]}>
        <StepScene
          label="Triathlon"
          step={4}
          text="Multi-sport files split into legs and transitions — one card tells the whole race."
          total={STEPS}
        >
          <SportStep
            data={SAMPLE_TRI}
            id="triathlon"
            metrics={["Swim", "T1", "Bike", "T2", "Run"]}
          />
        </StepScene>
      </TransitionSeries.Sequence>
      {t}
      <TransitionSeries.Sequence durationInFrames={WALK.outro}>
        <OutroScene sub="The right numbers, every time." />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
