"use client";

import { ArrowCounterClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { FilledBadge } from "@/components/app/primitives/badge";
import { PhotoOverlayButton } from "@/components/app/primitives/button";
import { Button } from "@/components/ui/button";
import { useImageAdjust } from "@/hooks/use-image-adjust";
import { IDENTITY_TRANSFORM, isIdentityTransform } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";
import { cn } from "@/lib/utils";

interface ImageAdjustOverlayProps {
  /** Optional clamp override (carousel uses the cover-overflow clamp). */
  clamp?: (t: ImageTransform) => ImageTransform;
  /** card-space width of the box the overlay covers (active format / slide) */
  contentWidth: number;
  /** what the gesture moves, shown over the hint (the Photo / Graphic switch) */
  header?: ReactNode;
  /** the gesture hint chip */
  hint?: string;
  onChange: (next: ImageTransform) => void;
  onDone: () => void;
  transform: ImageTransform;
}

/**
 * Full-card overlay shown while the user repositions their photo. The gesture
 * surface captures every pointer and stops propagation so the theme carousel
 * never swipes underneath it. Controls sit above the surface so their clicks
 * land normally.
 */
export const ImageAdjustOverlay = ({
  transform,
  onChange,
  onDone,
  clamp,
  contentWidth,
  header,
  hint = "Drag · pinch or scroll to zoom",
}: ImageAdjustOverlayProps) => {
  const { ref } = useImageAdjust({
    clamp,
    contentWidth,
    enabled: true,
    onChange,
    transform,
  });
  const canReset = !isIdentityTransform(transform);

  return (
    <div className="absolute inset-0 z-20">
      {/* Gesture surface — drag to pan, pinch/scroll to zoom, double-tap reset.
          Pointer-only and hidden from assistive tech: it carries no semantics
          of its own, and the keyboard/SR path is the labelled Reset/Done
          buttons below. (`role="application"` would wrongly flip SRs into
          application mode.) */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1] cursor-grab touch-none select-none active:cursor-grabbing"
        ref={ref}
      />

      {/* Frame + corner ticks (decorative). The huge-spread shadow is a scrim,
          not an elevation — it dims the card *outside* the crop frame (the
          `shadow-scrim` token, a 9999px spread). */}
      <div
        aria-hidden
        className="shadow-scrim pointer-events-none absolute inset-3 z-[2] border-2 border-white/80"
      >
        {(
          [
            "left-2 top-2",
            "right-2 top-2",
            "left-2 bottom-2",
            "right-2 bottom-2",
          ] as const
        ).map((pos) => (
          <span
            className={cn(
              "absolute size-4 border-t-2 border-l-2 border-white",
              pos
            )}
            key={pos}
          />
        ))}
      </div>

      {/* Target switch (when there is a choice) + hint chip */}
      <div className="absolute top-5 left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-2">
        {header}
        <FilledBadge className="pointer-events-none" tone="scrim">
          {hint}
        </FilledBadge>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-2">
        <PhotoOverlayButton
          disabled={!canReset}
          onClick={() => {
            onChange(IDENTITY_TRANSFORM);
          }}
          size="sm"
        >
          <ArrowCounterClockwiseIcon
            aria-hidden
            className="size-3.5"
            weight="duotone"
          />
          Reset
        </PhotoOverlayButton>
        <Button onClick={onDone} size="sm">
          <CheckIcon aria-hidden className="size-3.5" weight="duotone" />
          Done
        </Button>
      </div>
    </div>
  );
};
