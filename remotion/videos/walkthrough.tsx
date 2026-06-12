// Shared scaffolding for the tutorial walkthroughs — calmer than the hero:
// an opening title scene, numbered step scenes with the lower-third caption,
// and a closing sting. Every feature video is assembled from these three so
// the series reads as one set.

import type { ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Backdrop } from "../components/backdrop";
import { Caption } from "../components/caption";
import { KineticTitle } from "../components/kinetic-title";
import { LogoSting } from "../components/logo-sting";
import { RiseIn } from "../components/rise-in";
import { VideoFrame } from "../components/video-frame";
import { FONT, PAPER_DIM, RUST_BRIGHT, TRACKING, TYPE } from "../design/tokens";

/** Walkthrough pacing norms (frames @30fps) — slower than the hero's cuts. */
export const WALK = { fade: 12, outro: 110, title: 100 } as const;

export function TitleScene({
  blurb,
  kicker,
  lines,
}: {
  blurb: string;
  /** rust mono overline, e.g. "Tutorial · Quick start" */
  kicker: string;
  lines: string[];
}) {
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          flexDirection: "column",
          gap: 34,
          justifyContent: "center",
        }}
      >
        <RiseIn delay={2}>
          <div
            style={{
              color: RUST_BRIGHT,
              fontFamily: FONT.mono,
              fontSize: TYPE.caption,
              fontWeight: 600,
              letterSpacing: TRACKING.label,
              textTransform: "uppercase",
            }}
          >
            {kicker}
          </div>
        </RiseIn>
        <KineticTitle
          delay={8}
          lines={lines.map((text) => ({ text }))}
          size={TYPE.claim * 0.82}
        />
        <RiseIn delay={20}>
          <div
            style={{
              color: PAPER_DIM,
              fontFamily: FONT.sans,
              fontSize: TYPE.body,
              maxWidth: 900,
              textAlign: "center",
            }}
          >
            {blurb}
          </div>
        </RiseIn>
      </AbsoluteFill>
    </VideoFrame>
  );
}

/**
 * One numbered walkthrough beat: the visual sits centred above the safe-area
 * caption ("STEP n/m · label · sentence"). `children` is the demonstration.
 */
export function StepScene({
  children,
  label,
  step,
  text,
  total,
}: {
  children: ReactNode;
  label: string;
  step: number;
  text: string;
  total: number;
}) {
  const { height } = useVideoConfig();
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: height * 0.18,
        }}
      >
        {children}
      </AbsoluteFill>
      <Caption
        delay={8}
        label={label}
        maxWidth={1100}
        step={{ index: step, total }}
        text={text}
      />
    </VideoFrame>
  );
}

export function OutroScene({ sub }: { sub?: string }) {
  return (
    <VideoFrame>
      <Backdrop grain variant="ink" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <LogoSting sub={sub ?? "Free · No account · In your browser"} />
      </AbsoluteFill>
    </VideoFrame>
  );
}
