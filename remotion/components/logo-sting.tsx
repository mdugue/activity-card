import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, PAPER, PAPER_DIM, RUST, TRACKING, TYPE } from "../design/tokens";
import { RiseIn } from "./rise-in";

/**
 * The ascending Effort mark drawing itself in: the line traces via a
 * normalised stroke-dash, then the rust peak square pops with a small spring
 * overshoot — the one deliberate "pop" in the brand's motion language.
 * Geometry mirrors components/app/effort-wordmark.tsx exactly.
 */
export function AnimatedMark({
  delay = 0,
  peak = RUST,
  size = 150,
  stroke = PAPER,
}: {
  delay?: number;
  peak?: string;
  size?: number;
  stroke?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(frame - delay, [0, 22], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pop = spring({
    config: { damping: 12, stiffness: 140 },
    fps,
    frame: frame - delay - 16,
  });
  return (
    <svg height={size} viewBox="0 0 100 100" width={size}>
      <title>Effort</title>
      <path
        d="M14 82 L36 62 L52 70 L80 28"
        fill="none"
        pathLength={100}
        stroke={stroke}
        strokeDasharray={100}
        strokeDashoffset={100 - draw * 100}
        strokeLinejoin="miter"
        strokeWidth={11}
      />
      <rect
        fill={peak}
        height={16}
        style={{
          transform: `scale(${pop})`,
          transformBox: "fill-box",
          transformOrigin: "center",
        }}
        width={16}
        x={72}
        y={20}
      />
    </svg>
  );
}

/**
 * The intro/outro sting: mark draw-in, EFFORT wordmark, the rust-rule claim
 * row, and an optional small mono sub-line (CTA). Centre it in a VideoFrame.
 */
export function LogoSting({
  claim = "Make every effort worth sharing.",
  delay = 0,
  sub,
}: {
  claim?: string;
  delay?: number;
  /** small uppercase mono line under the claim, e.g. "Free · No account" */
  sub?: string;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 30,
      }}
    >
      <AnimatedMark delay={delay} />
      <RiseIn delay={delay + 14}>
        <div
          style={{
            color: PAPER,
            fontFamily: FONT.heading,
            fontSize: TYPE.claim * 0.73,
            letterSpacing: 8,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          Effort
        </div>
      </RiseIn>
      <RiseIn
        delay={delay + 34}
        style={{ alignItems: "center", display: "flex", gap: 18 }}
      >
        <span style={{ backgroundColor: RUST, height: 2, width: 44 }} />
        <span
          style={{
            color: PAPER,
            fontFamily: FONT.sans,
            fontSize: 32,
            letterSpacing: 1,
            opacity: 0.85,
          }}
        >
          {claim}
        </span>
        <span style={{ backgroundColor: RUST, height: 2, width: 44 }} />
      </RiseIn>
      {sub ? (
        <RiseIn delay={delay + 48} style={{ marginTop: 10 }}>
          <div
            style={{
              color: PAPER_DIM,
              fontFamily: FONT.mono,
              fontSize: TYPE.caption,
              fontWeight: 600,
              letterSpacing: TRACKING.label,
              textTransform: "uppercase",
            }}
          >
            {sub}
          </div>
        </RiseIn>
      ) : null}
    </div>
  );
}
