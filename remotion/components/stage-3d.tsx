import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { cameraDrift } from "../design/motion";

/**
 * A perspective stage for placing typography and cards in a shallow 3D room.
 * Wraps children in `preserve-3d` under a living camera (a subtle, continuous
 * yaw/pitch drift) so the whole scene breathes. Compose with `Plane3D` for the
 * pieces that face the centre from the left / right thirds.
 */
export const Stage3D = ({
  children,
  perspective = 1700,
  camera = true,
  style,
}: {
  camera?: boolean;
  children: ReactNode;
  perspective?: number;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const cam = cameraDrift(frame);
  return (
    <AbsoluteFill style={{ perspective, ...style }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: camera
            ? `rotateX(${cam.rotateX}deg) rotateY(${cam.rotateY}deg) scale(${cam.scale})`
            : undefined,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * One plane in the 3D stage — a block angled toward the centre. Positive
 * `rotateY` faces a left-side plane inward; negative faces a right-side plane
 * inward. `z` pushes it nearer (positive) or deeper (negative). Children keep
 * `preserve-3d` so nested planes still compose.
 */
export const Plane3D = ({
  children,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  x = 0,
  y = 0,
  z = 0,
  opacity = 1,
  origin = "center",
  style,
}: {
  children: ReactNode;
  opacity?: number;
  origin?: string;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  style?: CSSProperties;
  x?: number;
  y?: number;
  z?: number;
}) => (
  <div
    style={{
      opacity,
      position: "absolute",
      transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
      transformOrigin: origin,
      transformStyle: "preserve-3d",
      ...style,
    }}
  >
    {children}
  </div>
);
