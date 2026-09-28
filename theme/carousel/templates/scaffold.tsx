// Slide panel scaffold — the format-aware replacement for each panel's
// hand-rolled `position:absolute; inset:0; padding:SLIDE_PAD; flex column`.
// `SafeArea` floors content to the panel's natural margin or the platform
// keep-out, whichever is larger; the photo + canvas bleed underneath.

import type { CSSProperties, ReactNode } from "react";

import { CAROUSEL_NATURAL_PAD } from "@/theme/carousel/geometry";
import { SafeArea } from "@/theme/shared/format-context";

/** A slide panel scaffold: fills the slot, insets content to the merged safe
 *  area, pins `top` (the MetaBand) to the slide top, and anchors the main
 *  content to the slide's top or bottom — the spacer dance the panels used to
 *  hand-roll around `SLIDE_PAD`, now format-aware. */
export const SlideScaffold = ({
  anchor,
  top,
  children,
  style,
}: {
  anchor: "bottom" | "top";
  children: ReactNode;
  style?: CSSProperties;
  top?: ReactNode;
}) => (
  <SafeArea pad={CAROUSEL_NATURAL_PAD} style={style}>
    {top}
    {anchor === "bottom" ? <div style={{ flex: 1 }} /> : null}
    {children}
    {anchor === "top" ? <div style={{ flex: 1 }} /> : null}
  </SafeArea>
);
