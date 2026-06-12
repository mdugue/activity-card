import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DUR, RISE_PX, SETTLE_SPRING } from "../design/tokens";

/**
 * Fade + rise a block into place after `delay` frames — the app's entrance
 * (14px rise on a settle curve, no bounce) as the video system's primitive.
 * Every element entrance in every video goes through this or KineticTitle so
 * the motion language stays uniform.
 */
export function RiseIn({
  children,
  className,
  delay = 0,
  distance = RISE_PX,
  durationInFrames = DUR.beat,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** rise distance in px (RISE_PX for elements, RISE_LG_PX for claims) */
  distance?: number;
  durationInFrames?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    config: SETTLE_SPRING,
    durationInFrames,
    fps,
    frame: frame - delay,
  });
  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Fade a block out near the end of its scene — the quiet counterpart to
 * RiseIn for elements that must clear the stage before a cut.
 */
export function FadeOut({
  children,
  from,
  durationInFrames = DUR.fast,
  style,
}: {
  children: ReactNode;
  /** frame (scene-local) at which the fade starts */
  from: number;
  durationInFrames?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ ...style, opacity }}>{children}</div>;
}
