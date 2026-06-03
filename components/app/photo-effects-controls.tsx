"use client";

// Photo manipulation controls (filter preset + rotate + mirror) shown in the
// sidebar's photo block when a photo is loaded. Pure CSS filters keep
// preview === output with html-to-image.

import {
  ArrowClockwiseIcon,
  CircleHalfIcon,
  CloudFogIcon,
  DotsNineIcon,
  FilmStripIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  type Icon,
  ImageSquareIcon,
  MoonIcon,
  SnowflakeIcon,
  SparkleIcon,
  SunIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  FILTER_PRESETS,
  nextRotation,
  type PhotoEffects,
} from "@/lib/photo-effects";

// A glyph per preset that hints at its look — sun for warm, snowflake for cool,
// moon for moody noir, film strip for vintage sepia, half-circle for grayscale.
const FILTER_ICONS: Record<string, Icon> = {
  none: ImageSquareIcon,
  noir: MoonIcon,
  mono: CircleHalfIcon,
  vivid: SparkleIcon,
  warm: SunIcon,
  cool: SnowflakeIcon,
  fade: CloudFogIcon,
  sepia: FilmStripIcon,
};

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
          {FILTER_PRESETS.map((p) => {
            const FilterIcon = FILTER_ICONS[p.id];
            return (
              <ToggleGroupItem
                aria-label={p.label}
                className="flex h-auto items-center gap-1.5 px-2.5 py-1.5 font-medium font-mono text-[10px] uppercase tracking-wide"
                key={p.id}
                value={p.id}
              >
                {FilterIcon ? (
                  <FilterIcon aria-hidden className="size-3" weight="duotone" />
                ) : null}
                {p.label}
              </ToggleGroupItem>
            );
          })}
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
            <ArrowClockwiseIcon className="size-3.5" weight="duotone" />
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
          <FlipHorizontalIcon className="size-3.5" weight="duotone" />
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
          <FlipVerticalIcon className="size-3.5" weight="duotone" />
          Flip
        </Button>
        <Button
          aria-pressed={effects.grain}
          className={effects.grain ? "border-foreground" : ""}
          onClick={() => onChange({ ...effects, grain: !effects.grain })}
          size="sm"
          type="button"
          variant="outline"
        >
          <DotsNineIcon className="size-3.5" weight="duotone" />
          Grain
        </Button>
      </div>
    </div>
  );
}
