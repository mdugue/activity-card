"use client";

// Shared photo pan/zoom "Adjust" affordance for both editor previews. The hook
// derives the photo's natural size + a cover-overflow clamp for the active box,
// gates availability on (photo shown ∧ size known), and owns the `adjusting`
// flag (auto-closing when the photo goes away). `AdjustControls` renders the
// shared Adjust button + overlay. Only the box dimensions and the label differ between
// the single card (format box) and the carousel (whole strip).

import {
  ArrowsOutCardinalIcon,
  ImageIcon,
  PathIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { ReactNode } from "react";

import { PhotoOverlayButton } from "@/components/app/primitives/button";
import {
  OverlayToggleGroup,
  OverlayToggleItem,
} from "@/components/app/primitives/toggle-group";
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
  /** the theme also has a movable graphic — Adjust stays open without a photo */
  hasArt?: boolean;
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
  hasArt = false,
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
  if (adjusting && !adjustAvailable && !hasArt) {
    setAdjusting(false);
  }

  return { adjustAvailable, adjusting, coverClamp, imageSize, setAdjusting };
};

/** The theme's graphic as a second Adjust target: the same drag / pinch
 *  gesture, edited through its own transform and clamp. */
export interface ArtAdjust {
  clamp: (t: ImageTransform) => ImageTransform;
  onChange: (next: ImageTransform) => void;
  transform: ImageTransform;
}

type AdjustTarget = "art" | "photo";

const HINT: Record<AdjustTarget, string> = {
  art: "Drag · pinch or scroll to resize",
  photo: "Drag · pinch or scroll to zoom",
};

/** The overlay over the theme's graphic. */
const ArtOverlay = ({
  art,
  contentWidth,
  header,
  onDone,
}: {
  art: ArtAdjust;
  contentWidth: number;
  header: ReactNode;
  onDone: () => void;
}) => {
  const { clamp, onChange: handleChange, transform } = art;
  return (
    <ImageAdjustOverlay
      clamp={clamp}
      contentWidth={contentWidth}
      header={header}
      hint={HINT.art}
      onChange={handleChange}
      onDone={onDone}
      transform={transform}
    />
  );
};

/** The in-place Adjust badge + the pan/zoom overlay, positioned against the
 *  preview's `relative` card box. With `art`, the overlay offers a Photo /
 *  Graphic switch and the same gesture moves whichever is picked. */
export const AdjustControls = ({
  adjust,
  art,
  label,
  transform,
  onChange,
  contentWidth,
}: {
  adjust: PhotoAdjust;
  /** the theme's movable graphic, when it has one */
  art?: ArtAdjust;
  /** card-space width of the displayed box (format / slide) — drives pan speed */
  contentWidth: number;
  label: string;
  onChange: (next: ImageTransform) => void;
  transform: ImageTransform;
}) => {
  const { adjustAvailable, adjusting, coverClamp, setAdjusting } = adjust;
  // The graphic is what most themes want moved; the pick sticks while the
  // editor is open.
  const [picked, setPicked] = useState<AdjustTarget>("art");
  const available = adjustAvailable || art !== undefined;
  const target: AdjustTarget =
    art !== undefined && (picked === "art" || !adjustAvailable)
      ? "art"
      : "photo";
  const open = adjusting && available;
  const header =
    art !== undefined && adjustAvailable ? (
      <OverlayToggleGroup
        aria-label="What to adjust"
        onValueChange={(values: string[]) => {
          const [next] = values;
          if (next === "art" || next === "photo") {
            setPicked(next);
          }
        }}
        value={[target]}
      >
        <OverlayToggleItem value="photo">
          <ImageIcon aria-hidden className="size-3.5" weight="duotone" />
          Photo
        </OverlayToggleItem>
        <OverlayToggleItem value="art">
          <PathIcon aria-hidden className="size-3.5" weight="duotone" />
          Graphic
        </OverlayToggleItem>
      </OverlayToggleGroup>
    ) : null;

  return (
    <>
      {available && !open ? (
        <PhotoOverlayButton
          className="absolute top-3 right-3 z-10"
          onClick={() => {
            setAdjusting(true);
          }}
          size="sm"
        >
          <ArrowsOutCardinalIcon
            aria-hidden
            className="size-3.5"
            weight="duotone"
          />
          {label}
        </PhotoOverlayButton>
      ) : null}
      {open && target === "art" && art !== undefined ? (
        <ArtOverlay
          art={art}
          contentWidth={contentWidth}
          header={header}
          onDone={() => {
            setAdjusting(false);
          }}
        />
      ) : null}
      {open && target === "photo" ? (
        <ImageAdjustOverlay
          clamp={coverClamp}
          contentWidth={contentWidth}
          header={header}
          hint={HINT.photo}
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
