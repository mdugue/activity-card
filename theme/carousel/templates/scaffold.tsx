// Slide panel scaffold — the format-aware replacement for each panel's
// hand-rolled `position:absolute; inset:0; padding:SLIDE_PAD; flex column`.
// It fills the slide slot and insets content to the merged safe area
// (`SafeArea` floors the platform keep-out to the panel's natural margin), so
// the feed master is unchanged (90 > 48) while a tall Story / cover-cropped
// Strava pushes content clear of the chrome — with the photo + canvas still
// bleeding underneath. The panel reads its own SLIDE frame from the per-slide
// `FormatProvider` the deck wraps each slot in.

import type { CSSProperties, ReactNode } from "react";
import { CAROUSEL_NATURAL_MARGIN } from "@/theme/carousel/geometry";
import type { SafeInsets } from "@/theme/core/export-formats";
import { SafeArea } from "@/theme/shared/format-context";

/** The panel's natural margin as a per-side inset — `SafeArea` floors the
 *  platform safe zone to (at least) this on every slide. */
export const CAROUSEL_NATURAL_PAD: Partial<SafeInsets> = {
  top: CAROUSEL_NATURAL_MARGIN,
  right: CAROUSEL_NATURAL_MARGIN,
  bottom: CAROUSEL_NATURAL_MARGIN,
  left: CAROUSEL_NATURAL_MARGIN,
};

/** A slide panel scaffold: fills the slot, insets content to the merged safe
 *  area, pins `top` (the MetaBand) to the slide top, and anchors the main
 *  content to the slide's top or bottom — the spacer dance the panels used to
 *  hand-roll around `SLIDE_PAD`, now format-aware. */
export function SlideScaffold({
  anchor,
  top,
  children,
  style,
}: {
  anchor: "bottom" | "top";
  children: ReactNode;
  style?: CSSProperties;
  top?: ReactNode;
}) {
  return (
    <SafeArea pad={CAROUSEL_NATURAL_PAD} style={style}>
      {top}
      {anchor === "bottom" ? <div style={{ flex: 1 }} /> : null}
      {children}
      {anchor === "top" ? <div style={{ flex: 1 }} /> : null}
    </SafeArea>
  );
}
