"use client";

// "Text behind the horizon" on the preview: a Depth badge that opens a tap
// surface over the card. A tap picks what stands in front of the headline —
// that spot and everything nearer come forward (see lib/horizon-depth). The
// tap is mapped back through the photo's cover-fit, pan/zoom, rotation and
// mirror, so it lands on the pixel the user actually sees.

import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  StackIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { PointerEvent } from "react";

import { FilledBadge } from "@/components/app/primitives/badge";
import { PhotoOverlayButton } from "@/components/app/primitives/button";
import { Button } from "@/components/ui/button";
import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { UsePhotoCutout } from "@/hooks/use-photo-cutout";
import { cardPointToImage } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";

interface DepthPickProps {
  /** card-space size of the previewed format */
  boxH: number;
  boxW: number;
  cutout: UsePhotoCutout;
  effects: PhotoEffects;
  /** hide the badge while another overlay (Adjust) is open */
  hidden: boolean;
  imageSize: ImageSize | null;
  transform: ImageTransform;
}

export const DepthPick = ({
  boxW,
  boxH,
  cutout,
  effects,
  hidden,
  imageSize,
  transform,
}: DepthPickProps) => {
  const { resetDepth: handleResetDepth } = cutout;
  const [picking, setPicking] = useState(false);
  const available = cutout.status === "ready" && imageSize !== null;
  // Close the surface if the cut-out goes away (photo removed, switch off).
  if (picking && !available) {
    setPicking(false);
  }

  const handleTap = (event: PointerEvent<HTMLDivElement>) => {
    if (imageSize === null) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const point = cardPointToImage(
      ((event.clientX - rect.left) / rect.width) * boxW,
      ((event.clientY - rect.top) / rect.height) * boxH,
      {
        boxH,
        boxW,
        flipH: effects.flipH,
        flipV: effects.flipV,
        natH: imageSize.h,
        natW: imageSize.w,
        rotate: effects.rotate,
        transform,
      }
    );
    if (point) {
      cutout.pickAt(point.u, point.v);
    }
  };

  if (!available || hidden) {
    return null;
  }
  if (!picking) {
    return (
      <PhotoOverlayButton
        className="absolute top-3 left-3 z-10"
        onClick={() => {
          setPicking(true);
        }}
        size="sm"
      >
        <StackIcon aria-hidden className="size-3.5" weight="duotone" />
        Depth
      </PhotoOverlayButton>
    );
  }
  return (
    <div className="absolute inset-0 z-20">
      {/* Tap surface — pointer-only, like the Adjust gesture surface; the
          keyboard path is the labelled Reset / Done buttons below. */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1] cursor-crosshair touch-none select-none"
        onPointerUp={handleTap}
      />
      <FilledBadge
        className="pointer-events-none absolute top-5 left-1/2 z-[3] -translate-x-1/2"
        tone="scrim"
      >
        Tap what stands in front of the title
      </FilledBadge>
      <div className="absolute bottom-4 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-2">
        <PhotoOverlayButton onClick={handleResetDepth} size="sm">
          <ArrowCounterClockwiseIcon
            aria-hidden
            className="size-3.5"
            weight="duotone"
          />
          Sky only
        </PhotoOverlayButton>
        <Button
          onClick={() => {
            setPicking(false);
          }}
          size="sm"
        >
          <CheckIcon aria-hidden className="size-3.5" weight="duotone" />
          Done
        </Button>
      </div>
    </div>
  );
};
