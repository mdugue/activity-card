// Overlay & legibility layer (section 3). Sits between the photo and the text.
// Five treatments — bottom scrim (default), full tint, soft brand gradient,
// solid colour strip, and blur-behind-text. Opacity is resolved by the caller
// (auto-contrast from photo luminance, or a manual override).

import { hexToRgba } from "@/lib/carousel/resolve";
import type { OverlayStyle } from "@/lib/carousel/types";

interface OverlayProps {
  accent: string;
  opacity: number;
  style: OverlayStyle;
}

const BLACK = (a: number) => `rgba(0,0,0,${a})`;

// The overlay always anchors to the bottom of the slide (where the title/stats
// sit), so the scrim/band are bottom-weighted.
const BAND: React.CSSProperties = {
  bottom: 0,
  left: 0,
  right: 0,
  height: "44%",
};

function scrimGradient(op: number): string {
  return `linear-gradient(to top, ${BLACK(op)} 0%, ${BLACK(op * 0.55)} 20%, transparent 56%)`;
}

export function Overlay({ style, opacity, accent }: OverlayProps) {
  if (style === "none") {
    return null;
  }

  if (style === "tint") {
    return (
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: BLACK(opacity) }}
      />
    );
  }

  if (style === "brand") {
    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `${scrimGradient(opacity * 0.7)}, linear-gradient(to top, ${hexToRgba(accent, Math.min(0.85, opacity))} 0%, transparent 62%)`,
        }}
      />
    );
  }

  if (style === "strip" || style === "blur") {
    const fill =
      style === "blur"
        ? BLACK(Math.max(0.32, opacity * 0.55))
        : BLACK(Math.max(0.62, opacity));
    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          ...BAND,
          background: fill,
          // backdrop-filter may flatten in html-to-image; the translucent fill
          // above keeps text legible even if the blur drops on export.
          backdropFilter: style === "blur" ? "blur(16px)" : undefined,
          WebkitBackdropFilter: style === "blur" ? "blur(16px)" : undefined,
          borderTop: style === "strip" ? `3px solid ${accent}` : undefined,
        }}
      />
    );
  }

  // scrim (default)
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: scrimGradient(opacity),
      }}
    />
  );
}
