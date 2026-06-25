import type { ReactNode } from "react";
import {
  FONT,
  PAPER,
  RUST_BRIGHT,
  SAFE,
  TRACKING,
  TYPE,
} from "../design/tokens";
import { RiseIn } from "./rise-in";

/**
 * The sound-off reading layer: a rust mono overline (the app's caption-label
 * recipe) over a sentence of Inter. Pinned inside the safe area; every scene
 * that needs words uses this so type placement stays consistent across videos.
 */
export function Caption({
  delay = 0,
  label,
  maxWidth = 760,
  position = "bottom-left",
  step,
  text,
}: {
  delay?: number;
  /** rust mono overline, e.g. a feature name */
  label?: string;
  maxWidth?: number;
  position?: "bottom-center" | "bottom-left";
  /** numbered walkthrough chip, e.g. { index: 2, total: 4 } → "STEP 2/4" */
  step?: { index: number; total: number };
  text: ReactNode;
}) {
  const centered = position === "bottom-center";
  return (
    <div
      style={{
        alignItems: centered ? "center" : "flex-start",
        bottom: SAFE,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        left: centered ? "50%" : SAFE,
        maxWidth,
        position: "absolute",
        textAlign: centered ? "center" : "left",
        transform: centered ? "translateX(-50%)" : undefined,
      }}
    >
      {step || label ? (
        <RiseIn delay={delay}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 18,
            }}
          >
            {step ? (
              <span
                style={{
                  border: `2px solid ${RUST_BRIGHT}`,
                  borderRadius: 999,
                  color: RUST_BRIGHT,
                  fontFamily: FONT.mono,
                  fontSize: TYPE.micro,
                  fontWeight: 600,
                  letterSpacing: TRACKING.micro,
                  padding: "8px 18px",
                  textTransform: "uppercase",
                }}
              >
                Step {step.index}/{step.total}
              </span>
            ) : null}
            {label ? (
              <span
                style={{
                  color: RUST_BRIGHT,
                  fontFamily: FONT.mono,
                  fontSize: TYPE.caption,
                  fontWeight: 600,
                  letterSpacing: TRACKING.label,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
            ) : null}
          </div>
        </RiseIn>
      ) : null}
      <RiseIn delay={delay + 4}>
        <div
          style={{
            color: PAPER,
            fontFamily: FONT.sans,
            fontSize: TYPE.body + 4,
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {text}
        </div>
      </RiseIn>
    </div>
  );
}
