import type { ReactNode } from "react";
import {
  FONT,
  INK_RAISED,
  PAPER,
  RADIUS,
  RUST_BRIGHT,
  TRACKING,
  TYPE,
} from "../design/tokens";

/**
 * A file pill for the "drop your effort" beats — a rust dot and a mono
 * filename, the way the wizard talks about uploads.
 */
export function FileChip({
  label,
  scale = 1,
}: {
  label: string;
  scale?: number;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: INK_RAISED,
        borderRadius: RADIUS.pill,
        boxShadow:
          "0 24px 48px -16px rgba(0,0,0,0.55), 0 0 0 1px rgba(247,243,236,0.14)",
        color: PAPER,
        display: "inline-flex",
        fontFamily: FONT.mono,
        fontSize: TYPE.body * scale,
        fontWeight: 500,
        gap: 16 * scale,
        padding: `${18 * scale}px ${34 * scale}px`,
      }}
    >
      <span
        style={{
          backgroundColor: RUST_BRIGHT,
          borderRadius: RADIUS.pill,
          height: 14 * scale,
          width: 14 * scale,
        }}
      />
      {label}
    </div>
  );
}

/** Small uppercase mono pill — option labels, theme names, knob values. */
export function Pill({
  active = false,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        border: `2px solid ${active ? RUST_BRIGHT : "rgba(247,243,236,0.25)"}`,
        borderRadius: RADIUS.pill,
        color: active ? RUST_BRIGHT : PAPER,
        fontFamily: FONT.mono,
        fontSize: TYPE.caption,
        fontWeight: 600,
        letterSpacing: TRACKING.micro,
        opacity: active ? 1 : 0.62,
        padding: "10px 26px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/**
 * A palette-variant chip for the photo-colour beats: a short stack of the
 * scheme's colours with its mono label, highlighted when active.
 */
export function PaletteChip({
  active = false,
  colors,
  label,
}: {
  active?: boolean;
  colors: string[];
  label: string;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: active ? 1 : 0.5,
      }}
    >
      <div
        style={{
          borderRadius: RADIUS.md,
          boxShadow: active
            ? `0 0 0 3px ${RUST_BRIGHT}`
            : "0 0 0 1px rgba(247,243,236,0.18)",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {colors.map((c) => (
          <span key={c} style={{ backgroundColor: c, height: 64, width: 44 }} />
        ))}
      </div>
      <span
        style={{
          color: active ? RUST_BRIGHT : PAPER,
          fontFamily: FONT.mono,
          fontSize: TYPE.micro,
          fontWeight: 600,
          letterSpacing: TRACKING.micro,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}
