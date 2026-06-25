"use client";

// Photo manipulation controls, split so the focused-toolbar layout can place
// them in different categories: `PhotoFilterControl` is the filter-preset row
// (its own FILTER category) and `PhotoTransformControls` is rotate/mirror/flip/
// grain (shown inside the PHOTO category). Pure CSS filters keep preview ===
// output with snapdom.

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
import { Toggle } from "@/components/ui/toggle";
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

interface PhotoControlProps {
  effects: PhotoEffects;
  onChange: (next: PhotoEffects) => void;
}

/** Filter-preset row. Its section label is supplied by the FILTER category. */
export function PhotoFilterControl({ effects, onChange }: PhotoControlProps) {
  return (
    <ToggleGroup
      aria-label="Photo filter"
      className="mt-2 flex flex-wrap gap-1.5"
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
            className="data-[pressed]:!border-foreground data-[pressed]:!bg-foreground data-[pressed]:!text-background flex h-auto items-center gap-1.5 px-2.5 py-1.5 font-medium font-mono text-[10px] uppercase tracking-wide"
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
  );
}

/** Rotate / mirror / flip / grain row, shown inside the PHOTO category. */
export function PhotoTransformControls({
  effects,
  onChange,
}: PhotoControlProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
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
      <Toggle
        className="data-[pressed]:!border-foreground data-[pressed]:!bg-foreground data-[pressed]:!text-background gap-1.5"
        onPressedChange={(p) => onChange({ ...effects, flipH: p })}
        pressed={effects.flipH}
        size="sm"
        variant="outline"
      >
        <FlipHorizontalIcon className="size-3.5" weight="duotone" />
        Mirror
      </Toggle>
      <Toggle
        className="data-[pressed]:!border-foreground data-[pressed]:!bg-foreground data-[pressed]:!text-background gap-1.5"
        onPressedChange={(p) => onChange({ ...effects, flipV: p })}
        pressed={effects.flipV}
        size="sm"
        variant="outline"
      >
        <FlipVerticalIcon className="size-3.5" weight="duotone" />
        Flip
      </Toggle>
      <Toggle
        className="data-[pressed]:!border-foreground data-[pressed]:!bg-foreground data-[pressed]:!text-background gap-1.5"
        onPressedChange={(p) => onChange({ ...effects, grain: p })}
        pressed={effects.grain}
        size="sm"
        variant="outline"
      >
        <DotsNineIcon className="size-3.5" weight="duotone" />
        Grain
      </Toggle>
    </div>
  );
}
