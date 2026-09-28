"use client";

// Shared photo pan/zoom "Adjust" affordance for both editor previews. The hook
// derives the photo's natural size + a cover-overflow clamp for the active box,
// gates availability on (photo shown ∧ size known), and owns the `adjusting`
// flag (auto-closing when the photo goes away). `AdjustControls` renders the
// shared Badge + overlay. Only the box dimensions and the label differ between
// the single card (format box) and the carousel (whole strip).

import { ArrowsOutCardinalIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ImageSize } from "@/hooks/use-image-natural-size";
import { clampCoverTransform } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";
import { isQuarterTurn } from "@/lib/photo-effects";
import type { RotateDeg } from "@/lib/photo-effects";

import { ImageAdjustOverlay } from "./image-adjust-overlay";

interface PhotoAdjustArgs {
  /** the box the photo covers — the single-card format, or the carousel strip */
  boxH: number;
  boxW: number;
  /** whether the background photo is currently shown */
  enabled: boolean;
  photoUrl: string | null;
  /** photo rotation — a quarter-turn swaps the clamp's width/height */
  rotate: RotateDeg;
}

export interface PhotoAdjust {
  adjustAvailable: boolean;
  adjusting: boolean;
  /** cover-overflow clamp for the active box, or undefined until size is known */
  coverClamp: ((t: ImageTransform) => ImageTransform) | undefined;
  imageSize: ImageSize | null;
  setAdjusting: (v: boolean) => void;
}

export const usePhotoAdjust = ({
  boxW,
  boxH,
  enabled,
  photoUrl,
  rotate,
}: PhotoAdjustArgs): PhotoAdjust => {
  const [adjusting, setAdjusting] = useState(false);

  // Natural photo size → a pan/zoom clamp that respects the photo's real cover
  // overflow on the active box. A quarter-turn swaps the photo's width/height.
  const imageSize = useImageNaturalSize(photoUrl);
  const quarter = isQuarterTurn(rotate);
  const coverClamp = imageSize
    ? (t: ImageTransform) =>
        clampCoverTransform(
          t,
          boxW,
          boxH,
          quarter ? imageSize.h : imageSize.w,
          quarter ? imageSize.w : imageSize.h
        )
    : undefined;

  // Adjust only makes sense while the photo is shown AND its natural size is
  // known (the clamp derives from it); close it if either goes away.
  // Adjusted during render (not in an effect) so the stale open overlay is
  // never painted.
  const adjustAvailable = photoUrl !== null && enabled && imageSize !== null;
  if (adjusting && !adjustAvailable) {
    setAdjusting(false);
  }

  return { adjustAvailable, adjusting, coverClamp, imageSize, setAdjusting };
};

/** The in-place Adjust badge + the pan/zoom overlay, positioned against the
 *  preview's `relative` card box. */
export const AdjustControls = ({
  adjust,
  label,
  transform,
  onChange,
  contentWidth,
}: {
  adjust: PhotoAdjust;
  /** card-space width of the displayed box (format / slide) — drives pan speed */
  contentWidth: number;
  label: string;
  onChange: (next: ImageTransform) => void;
  transform: ImageTransform;
}) => {
  const { adjustAvailable, adjusting, coverClamp, setAdjusting } = adjust;
  return (
    <>
      {adjustAvailable && !adjusting ? (
        <Badge
          className="absolute top-3 right-3 z-10 rounded-full bg-black/55 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/75"
          render={
            <button
              aria-label={label}
              onClick={() => {
                setAdjusting(true);
              }}
              type="button"
            />
          }
        >
          <ArrowsOutCardinalIcon
            aria-hidden
            className="size-3"
            weight="duotone"
          />
          {label}
        </Badge>
      ) : null}
      {adjusting ? (
        <ImageAdjustOverlay
          clamp={coverClamp}
          contentWidth={contentWidth}
          onChange={onChange}
          onDone={() => {
            setAdjusting(false);
          }}
          transform={transform}
        />
      ) : null}
    </>
  );
};
