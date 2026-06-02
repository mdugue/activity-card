"use client";

import { Check, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useImageAdjust } from "@/hooks/use-image-adjust";
import {
  IDENTITY_TRANSFORM,
  type ImageTransform,
  isIdentityTransform,
} from "@/lib/image-transform";
import { cn } from "@/lib/utils";

interface ImageAdjustOverlayProps {
  /** Optional clamp override (carousel uses the cover-overflow clamp). */
  clamp?: (t: ImageTransform) => ImageTransform;
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
export function ImageAdjustOverlay({
  transform,
  onChange,
  onDone,
  clamp,
}: ImageAdjustOverlayProps) {
  const { ref } = useImageAdjust({ enabled: true, transform, onChange, clamp });
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
          not an elevation — it dims the card *outside* the crop frame, so it
          stays an arbitrary value rather than a Tailwind shadow-* class. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 z-[2] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"
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
              "absolute size-4 border-white border-t-2 border-l-2",
              pos
            )}
            key={pos}
          />
        ))}
      </div>

      {/* Hint chip */}
      <Badge className="pointer-events-none absolute top-5 left-1/2 z-[3] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[10px] text-white backdrop-blur-sm">
        Drag · pinch or scroll to zoom
      </Badge>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-2">
        <Button
          className="bg-white/90 text-black hover:bg-white"
          disabled={!canReset}
          onClick={() => onChange(IDENTITY_TRANSFORM)}
          size="sm"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          Reset
        </Button>
        <Button onClick={onDone} size="sm">
          <Check aria-hidden className="size-3.5" />
          Done
        </Button>
      </div>
    </div>
  );
}
