// Motion helpers for the video system — continuous, never-static movement.
// The app's entrances settle (RiseIn); these add the cinematic layer: elements
// that keep drifting the whole time they're on screen, and a 3D stage with a
// living camera so nothing ever sits dead still.

import { Easing, interpolate } from "remotion";

/**
 * The "linger" map: a 0→1 progress remapped so it races through the ends and
 * crawls through the middle. Drives one continuous A→B travel that slows
 * massively while the element is centred (the sweet spot the brief asks for) —
 * the fast parts happen off-screen at the edges, the elegant glide on-screen.
 *
 * `power` > 1 deepens the centre dwell (2.2 ≈ a long, graceful hold).
 */
export function linger(progress: number, power = 2.2): number {
  const t = Math.min(1, Math.max(0, progress));
  const signed = 2 * t - 1; // −1 … 1
  const eased = Math.sign(signed) * Math.abs(signed) ** power;
  return 0.5 + 0.5 * eased;
}

/**
 * A value that travels `from`→`to` across [startF, endF] with the lingering
 * slowdown in the middle. Use for elements that enter one side and leave the
 * other as a single, continuous, decelerating-then-accelerating move.
 */
export function lingerValue(
  frame: number,
  range: readonly [number, number],
  values: readonly [number, number],
  power = 2.2
): number {
  const p = interpolate(frame, range, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return interpolate(linger(p, power), [0, 1], values);
}

/** A slow sine drift around a centre — keeps "resting" elements alive. */
export function breathe(
  frame: number,
  amplitude: number,
  periodFrames: number,
  phase = 0
): number {
  return Math.sin((frame / periodFrames) * Math.PI * 2 + phase) * amplitude;
}

/**
 * A living camera: a tiny continuous yaw/pitch/zoom drift to wrap a whole
 * scene in, so the 3D stage feels hand-held rather than locked. Subtle by
 * design — readability first.
 */
export function cameraDrift(frame: number): {
  rotateX: number;
  rotateY: number;
  scale: number;
} {
  return {
    rotateY: breathe(frame, 2.4, 230),
    rotateX: breathe(frame, 1.4, 310, 1.1),
    scale: 1 + breathe(frame, 0.012, 270, 0.5),
  };
}

/** Ease used for 3D entrances/exits — soft, no bounce (matches the app). */
export const EASE_GLIDE = Easing.bezier(0.22, 1, 0.36, 1);
