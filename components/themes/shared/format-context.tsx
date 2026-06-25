"use client";

// The format-aware rendering contract. Every single-card theme renders DIRECTLY
// at the target export dimensions and reads them — plus the platform safe insets
// — from this context, instead of being authored at 1080×1350 and scaled as one
// block by an external frame. Two coordinate systems are available in the same
// render tree:
//
//   • the FULL canvas (`useFormat().width × height`) — backgrounds, route /
//     elevation silhouettes, anything that should bleed past the safe zone;
//   • the SAFE box (`useSafeInsets(...)`) — headlines, stats, meta, anything
//     that must stay clear of the platform's UI.
//
// Because both live in one tree, a single element can mask one against the other
// (e.g. Altitude's claim sliced by the elevation curve) — impossible when the
// background and the content are split across independent layers.
//
// The default is the 4:5 feed master, so a theme rendered without a provider (a
// bare Storybook story) gets 1080×1350 / 48 px safe — and since every theme's
// own margins exceed 48 px, `useSafeInsets` returns those margins unchanged and
// the master stays pixel-identical to the legacy output.

import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import {
  EXPORT_FORMATS,
  type ExportFormat,
  mergeSafe,
  type SafeInsets,
} from "@/lib/export-formats";

const FormatContext = createContext<ExportFormat>(
  EXPORT_FORMATS["instagram-feed"]
);

export const FormatProvider = FormatContext.Provider;

/** The active export format — dimensions, safe insets, aspect bucket. */
export function useFormat(): ExportFormat {
  return useContext(FormatContext);
}

/**
 * The per-side insets a theme should apply: the larger of its own aesthetic
 * margin and the format's platform safe inset (see `mergeSafe`). Pass the
 * theme's natural 4:5 margins so the master renders unchanged.
 */
export function useSafeInsets(natural?: Partial<SafeInsets>): SafeInsets {
  return mergeSafe(useContext(FormatContext).safe, natural);
}

/**
 * A layer that fills the whole canvas, ignoring safe zones — for backgrounds and
 * full-bleed silhouettes. Children manage their own `aria-hidden`.
 */
export function FullBleed({
  children,
  style,
  zIndex,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  zIndex?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A flex column inset by the resolved safe area — the home for legible content.
 * `pad` is the theme's natural 4:5 margin; `anchor` places the column within the
 * safe box on the block axis (upper / center / lower).
 */
const ANCHOR_JUSTIFY: Record<
  "center" | "lower" | "upper",
  CSSProperties["justifyContent"]
> = {
  center: "center",
  lower: "flex-end",
  upper: "flex-start",
};

export function SafeArea({
  anchor = "upper",
  children,
  pad,
  style,
}: {
  anchor?: "center" | "lower" | "upper";
  children?: ReactNode;
  pad?: Partial<SafeInsets>;
  style?: CSSProperties;
}) {
  const i = useSafeInsets(pad);
  const justifyContent = ANCHOR_JUSTIFY[anchor];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        boxSizing: "border-box",
        paddingTop: i.top,
        paddingRight: i.right,
        paddingBottom: i.bottom,
        paddingLeft: i.left,
        display: "flex",
        flexDirection: "column",
        justifyContent,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
