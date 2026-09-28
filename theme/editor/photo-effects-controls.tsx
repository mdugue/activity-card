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
  ImageSquareIcon,
  MoonIcon,
  SnowflakeIcon,
  SparkleIcon,
  SunIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import {
  OptionToggle,
  OptionToggleItem,
} from "@/components/app/primitives/toggle-group";
import { Button } from "@/components/ui/button";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { FILTER_PRESETS, nextRotation } from "@/lib/photo-effects";
import type { PhotoEffects } from "@/lib/photo-effects";

// A glyph per preset that hints at its look — sun for warm, snowflake for cool,
// moon for moody noir, film strip for vintage sepia, half-circle for grayscale.
const FILTER_ICONS = {
  cool: SnowflakeIcon,
  fade: CloudFogIcon,
  mono: CircleHalfIcon,
  noir: MoonIcon,
  none: ImageSquareIcon,
  sepia: FilmStripIcon,
  vivid: SparkleIcon,
  warm: SunIcon,
} satisfies Record<string, Icon>;

const hasFilterIcon = (id: string): id is keyof typeof FILTER_ICONS =>
  Object.hasOwn(FILTER_ICONS, id);

interface PhotoControlProps {
  effects: PhotoEffects;
  onChange: (next: PhotoEffects) => void;
}

/** Filter-preset row. Its section label is supplied by the FILTER category. */
export const PhotoFilterControl = ({
  effects,
  onChange,
}: PhotoControlProps) => (
  <ToggleGroup
    aria-label="Photo filter"
    className="mt-2 flex flex-wrap"
    onValueChange={(values) => {
      if (values[0]) {
        onChange({ ...effects, filter: values[0] });
      }
    }}
    spacing={1.5}
    value={[effects.filter]}
    variant="outline"
  >
    {FILTER_PRESETS.map((p) => {
      const FilterIcon = hasFilterIcon(p.id) ? FILTER_ICONS[p.id] : null;
      return (
        <OptionToggleItem
          aria-label={p.label}
          key={p.id}
          look="chip"
          tone="invert"
          value={p.id}
        >
          {FilterIcon === null ? null : (
            <FilterIcon aria-hidden className="size-3" weight="duotone" />
          )}
          {p.label}
        </OptionToggleItem>
      );
    })}
  </ToggleGroup>
);

/** Rotate / mirror / flip / grain row, shown inside the PHOTO category. */
export const PhotoTransformControls = ({
  effects,
  onChange,
}: PhotoControlProps) => (
  <div className="mt-3 flex flex-wrap items-center gap-2">
    <Button
      onClick={() => {
        onChange({ ...effects, rotate: nextRotation(effects.rotate) });
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      <ArrowClockwiseIcon className="size-3.5" weight="duotone" />
      Rotate
    </Button>
    <OptionToggle
      onPressedChange={(p) => {
        onChange({ ...effects, flipH: p });
      }}
      pressed={effects.flipH}
      size="sm"
      tone="invert"
      variant="outline"
    >
      <FlipHorizontalIcon className="size-3.5" weight="duotone" />
      Mirror
    </OptionToggle>
    <OptionToggle
      onPressedChange={(p) => {
        onChange({ ...effects, flipV: p });
      }}
      pressed={effects.flipV}
      size="sm"
      tone="invert"
      variant="outline"
    >
      <FlipVerticalIcon className="size-3.5" weight="duotone" />
      Flip
    </OptionToggle>
    <OptionToggle
      onPressedChange={(p) => {
        onChange({ ...effects, grain: p });
      }}
      pressed={effects.grain}
      size="sm"
      tone="invert"
      variant="outline"
    >
      <DotsNineIcon className="size-3.5" weight="duotone" />
      Grain
    </OptionToggle>
  </div>
);
