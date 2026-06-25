import type { CSSProperties, ReactNode } from "react";
import { interpolate } from "remotion";
import { CARD, PAPER_FAINT } from "../design/tokens";

const CARD_SHADOW =
  "0 60px 120px -40px rgba(0,0,0,0.65), 0 0 0 1px rgba(247,243,236,0.10)";

/**
 * Scales one real 1080×1350 card render (a single-card theme fed with sample
 * data) down to `height` and frames it with the brand shadow. The card keeps
 * its exact export proportions — never stretch it.
 */
export function CardScaled({
  children,
  height,
  shadow = true,
  style,
}: {
  children: ReactNode;
  height: number;
  shadow?: boolean;
  style?: CSSProperties;
}) {
  const scale = height / CARD.height;
  return (
    <div
      style={{
        borderRadius: 6,
        boxShadow: shadow ? CARD_SHADOW : undefined,
        flex: "none",
        height,
        overflow: "hidden",
        position: "relative",
        width: CARD.width * scale,
        ...style,
      }}
    >
      <div
        style={{
          height: CARD.height,
          left: 0,
          position: "absolute",
          top: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: CARD.width,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Pans across a seamless carousel strip (a `CarouselDeck`, n×1080 wide) scaled
 * to `height`. `panFrom`/`panTo` are x-offsets in strip pixels; drive
 * `progress` from the scene's frame. `showSeams` overlays hairlines on the
 * slide boundaries to demonstrate how the strip slices into slides.
 */
export function StripPan({
  children,
  height,
  panFrom,
  panTo,
  progress,
  showSeams = false,
  slideCount,
  style,
}: {
  children: ReactNode;
  height: number;
  panFrom: number;
  panTo: number;
  progress: number;
  showSeams?: boolean;
  slideCount: number;
  style?: CSSProperties;
}) {
  const scale = height / CARD.height;
  const x = interpolate(progress, [0, 1], [panFrom, panTo]);
  const seams: number[] = [];
  if (showSeams) {
    for (let i = 1; i < slideCount; i++) {
      seams.push((i * CARD.width - x) * scale);
    }
  }
  return (
    <div
      style={{
        height,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          height: CARD.height,
          left: 0,
          position: "absolute",
          top: 0,
          transform: `scale(${scale}) translateX(${-x}px)`,
          transformOrigin: "top left",
          width: slideCount * CARD.width,
        }}
      >
        {children}
      </div>
      {seams.map((left) => (
        <div
          key={left}
          style={{
            backgroundColor: PAPER_FAINT,
            bottom: 0,
            left,
            position: "absolute",
            top: 0,
            width: 2,
          }}
        />
      ))}
    </div>
  );
}
