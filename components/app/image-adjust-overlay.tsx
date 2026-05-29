"use client";

import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageAdjust } from "@/hooks/use-image-adjust";
import {
  IDENTITY_TRANSFORM,
  type ImageTransform,
  isIdentityTransform,
} from "@/lib/image-transform";

interface ImageAdjustOverlayProps {
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
}: ImageAdjustOverlayProps) {
  const { ref } = useImageAdjust({ enabled: true, transform, onChange });
  const canReset = !isIdentityTransform(transform);

  return (
    <div className="absolute inset-0 z-20">
      {/* Gesture surface — drag to pan, pinch/scroll to zoom, double-tap reset */}
      <div
        aria-label="Drag to reposition, pinch or scroll to zoom, double-tap to reset"
        className="absolute inset-0 z-[1] cursor-grab touch-none select-none active:cursor-grabbing"
        ref={ref}
        role="application"
      />

      {/* Frame + corner ticks (decorative) */}
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
            className={`absolute size-4 border-white border-t-2 border-l-2 ${pos}`}
            key={pos}
          />
        ))}
      </div>

      {/* Hint chip */}
      <div className="pointer-events-none absolute top-5 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-3 py-1.5 font-medium font-mono text-[10px] text-white uppercase tracking-[0.16em] backdrop-blur-sm">
        Drag · pinch or scroll to zoom
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-2">
        <Button
          className="bg-white/90 text-black hover:bg-white disabled:opacity-40"
          disabled={!canReset}
          onClick={() => onChange(IDENTITY_TRANSFORM)}
          size="sm"
          variant="secondary"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          Reset
        </Button>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onDone}
          size="sm"
        >
          <Check aria-hidden className="size-3.5" />
          Done
        </Button>
      </div>
    </div>
  );
}
