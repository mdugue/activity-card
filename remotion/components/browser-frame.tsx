import type { CSSProperties, ReactNode } from "react";
import {
  FONT,
  INK,
  INK_RAISED,
  PAPER_FAINT,
  RADIUS,
  TRACKING,
  TYPE,
} from "../design/tokens";

/**
 * Minimal browser chrome for app vignettes — three window dots and a quiet
 * mono address pill over the content. Size it from the outside; the content
 * area clips.
 */
export function BrowserFrame({
  children,
  label = "effort",
  style,
}: {
  children: ReactNode;
  /** text in the address pill */
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        backgroundColor: INK_RAISED,
        borderRadius: RADIUS.lg,
        boxShadow:
          "0 60px 120px -40px rgba(0,0,0,0.65), 0 0 0 1px rgba(247,243,236,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flex: "none",
          gap: 10,
          height: 58,
          paddingLeft: 24,
          paddingRight: 24,
          position: "relative",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              backgroundColor: PAPER_FAINT,
              borderRadius: 999,
              height: 13,
              width: 13,
            }}
          />
        ))}
        <span
          style={{
            backgroundColor: INK,
            borderRadius: 999,
            color: PAPER_FAINT,
            fontFamily: FONT.mono,
            fontSize: TYPE.micro,
            fontWeight: 500,
            left: "50%",
            letterSpacing: TRACKING.micro,
            padding: "7px 26px",
            position: "absolute",
            textTransform: "uppercase",
            transform: "translateX(-50%)",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}
