import { FONT, PAPER, RUST_BRIGHT, TRACKING, TYPE } from "../design/tokens";
import { RiseIn } from "./rise-in";

export interface KineticLine {
  /** render this line in the rust accent instead of paper */
  accent?: boolean;
  text: string;
}

/**
 * Big Anton claims, one line rising after the other — the staggered reveal
 * the empty-state hero uses, sized for the video canvas. Lines are uppercase
 * by construction; mark one `accent: true` for the rust pay-off line.
 */
export function KineticTitle({
  align = "center",
  color = PAPER,
  delay = 0,
  lines,
  size = TYPE.claim,
  stagger = 6,
}: {
  align?: "center" | "left";
  color?: string;
  delay?: number;
  lines: KineticLine[];
  size?: number;
  stagger?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
      }}
    >
      {lines.map((line, i) => (
        <RiseIn
          delay={delay + i * stagger}
          distance={Math.round(size * 0.16)}
          key={line.text}
        >
          <div
            style={{
              color: line.accent ? RUST_BRIGHT : color,
              fontFamily: FONT.heading,
              fontSize: size,
              letterSpacing: TRACKING.heading,
              lineHeight: 0.98,
              textTransform: "uppercase",
            }}
          >
            {line.text}
          </div>
        </RiseIn>
      ))}
    </div>
  );
}
