import { interpolate, useCurrentFrame } from "remotion";
import { EASE_PANEL, PAPER, RUST_BRIGHT } from "../design/tokens";

export interface CursorKeyframe {
  /** pulse a click ring on arrival at this keyframe */
  click?: boolean;
  frame: number;
  x: number;
  y: number;
}

const CLICK_FRAMES = 16;

/**
 * A cursor dot for faked UI beats — glides between keyframes on the app's
 * panel curve and pulses a ring on clicks. Coordinates are canvas pixels.
 */
export function Cursor({
  keyframes,
  size = 30,
}: {
  keyframes: CursorKeyframe[];
  size?: number;
}) {
  const frame = useCurrentFrame();
  const frames = keyframes.map((k) => k.frame);
  const single = keyframes.length === 1;
  const x = single
    ? keyframes[0].x
    : interpolate(
        frame,
        frames,
        keyframes.map((k) => k.x),
        {
          easing: EASE_PANEL,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );
  const y = single
    ? keyframes[0].y
    : interpolate(
        frame,
        frames,
        keyframes.map((k) => k.y),
        {
          easing: EASE_PANEL,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );

  return (
    <div
      style={{
        left: x,
        pointerEvents: "none",
        position: "absolute",
        top: y,
        transform: "translate(-50%, -50%)",
        zIndex: 40,
      }}
    >
      {keyframes
        .filter((k) => k.click)
        .map((k) => {
          const t = frame - k.frame;
          if (t < 0 || t > CLICK_FRAMES) {
            return null;
          }
          const p = t / CLICK_FRAMES;
          const ringSize = size * (1 + p * 2);
          return (
            <div
              key={k.frame}
              style={{
                border: `3px solid ${PAPER}`,
                borderRadius: 999,
                height: ringSize,
                left: "50%",
                opacity: 0.55 * (1 - p),
                position: "absolute",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: ringSize,
              }}
            />
          );
        })}
      <div
        style={{
          backgroundColor: RUST_BRIGHT,
          border: `3px solid ${PAPER}`,
          borderRadius: 999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
          height: size,
          width: size,
        }}
      />
    </div>
  );
}
