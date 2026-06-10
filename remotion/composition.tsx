import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Minimal placeholder intro for the empty-state "How it works" band. A real
// narrated walkthrough lands later; this dummy just proves the pipeline (a
// Remotion composition rendered on-page through @remotion/player).
//
// The brand palette is hard-coded rather than read from Tailwind tokens so the
// composition renders identically in the on-page <Player>, Remotion Studio, and
// the CLI renderer — none of which load app/globals.css.
const INK = "#1f1a16";
const PAPER = "#f7f3ec";
const RUST = "#c45a2c";
const HEADING_FONT =
  '"Space Grotesk", "Bricolage Grotesque", system-ui, -apple-system, sans-serif';

export const INTRO_FPS = 30;
export const INTRO_WIDTH = 1280;
export const INTRO_HEIGHT = 720;
export const INTRO_DURATION_IN_FRAMES = 150; // 5s

// The ascending Effort mark: the line traces itself in via a normalised
// stroke-dash (pathLength=100 keeps the maths unit-agnostic), then the rust
// peak square pops with a little spring overshoot.
const Mark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const pop = spring({
    frame: frame - 16,
    fps,
    config: { damping: 12, stiffness: 140 },
  });
  return (
    <svg height={150} viewBox="0 0 100 100" width={150}>
      <title>Effort</title>
      <path
        d="M14 82 L36 62 L52 70 L80 28"
        fill="none"
        pathLength={100}
        stroke={PAPER}
        strokeDasharray={100}
        strokeDashoffset={100 - draw * 100}
        strokeLinejoin="miter"
        strokeWidth={11}
      />
      <rect
        fill={RUST}
        height={16}
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          transform: `scale(${pop})`,
        }}
        width={16}
        x={72}
        y={20}
      />
    </svg>
  );
};

// Fade + rise a block into place after `delay` frames, with a soft (non-bouncy)
// spring so the entrance reads as a gentle slide-up.
const RiseIn: React.FC<{
  children: React.ReactNode;
  delay: number;
  style?: React.CSSProperties;
}> = ({ children, delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  return (
    <div
      style={{
        ...style,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [26, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const EffortIntro: React.FC = () => (
  <AbsoluteFill
    style={{
      alignItems: "center",
      backgroundColor: INK,
      fontFamily: HEADING_FONT,
      justifyContent: "center",
    }}
  >
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 30,
      }}
    >
      <Mark />
      <RiseIn delay={14}>
        <div
          style={{
            color: PAPER,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: 8,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          Effort
        </div>
      </RiseIn>
      <RiseIn
        delay={34}
        style={{ alignItems: "center", display: "flex", gap: 18 }}
      >
        <span style={{ backgroundColor: RUST, height: 2, width: 44 }} />
        <span
          style={{ color: PAPER, fontSize: 32, letterSpacing: 1, opacity: 0.8 }}
        >
          Make every effort worth sharing.
        </span>
        <span style={{ backgroundColor: RUST, height: 2, width: 44 }} />
      </RiseIn>
      {/* This clip is a placeholder; the closing beat says so outright. */}
      <RiseIn delay={56} style={{ marginTop: 14 }}>
        <div
          style={{
            color: PAPER,
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: 5,
            opacity: 0.4,
            textTransform: "uppercase",
          }}
        >
          Full walkthrough coming soon
        </div>
      </RiseIn>
    </div>
  </AbsoluteFill>
);
