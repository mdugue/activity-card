"use client";

// Photo manipulation controls (filter preset + rotate + mirror) shown in the
// sidebar's photo block when a photo is loaded. Pure CSS filters keep
// preview === output with html-to-image.

import { FlipHorizontal2, FlipVertical2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  FILTER_PRESETS,
  nextRotation,
  type PhotoEffects,
} from "@/lib/photo-effects";

interface PhotoEffectsControlsProps {
  /** rotate is geometry-correct on the carousel panorama; hidden elsewhere */
  allowRotate?: boolean;
  effects: PhotoEffects;
  onChange: (next: PhotoEffects) => void;
}

export function PhotoEffectsControls({
  effects,
  onChange,
  allowRotate = false,
}: PhotoEffectsControlsProps) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div>
        <div className="caption-micro mb-1.5">FILTER</div>
        <ToggleGroup
          aria-label="Photo filter"
          className="flex flex-wrap gap-1.5"
          onValueChange={(values) => {
            if (values[0]) {
              onChange({ ...effects, filter: values[0] });
            }
          }}
          spacing={2}
          value={[effects.filter]}
          variant="outline"
        >
          {FILTER_PRESETS.map((p) => (
            <ToggleGroupItem
              aria-label={p.label}
              className="h-auto px-2.5 py-1.5 font-medium font-mono text-[10px] uppercase tracking-wide"
              key={p.id}
              value={p.id}
            >
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        {allowRotate ? (
          <Button
            onClick={() =>
              onChange({ ...effects, rotate: nextRotation(effects.rotate) })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCw className="size-3.5" />
            Rotate
          </Button>
        ) : null}
        <Button
          aria-pressed={effects.flipH}
          className={effects.flipH ? "border-foreground" : ""}
          onClick={() => onChange({ ...effects, flipH: !effects.flipH })}
          size="sm"
          type="button"
          variant="outline"
        >
          <FlipHorizontal2 className="size-3.5" />
          Mirror
        </Button>
        <Button
          aria-pressed={effects.flipV}
          className={effects.flipV ? "border-foreground" : ""}
          onClick={() => onChange({ ...effects, flipV: !effects.flipV })}
          size="sm"
          type="button"
          variant="outline"
        >
          <FlipVertical2 className="size-3.5" />
          Flip
        </Button>
      </div>
    </div>
  );
}
