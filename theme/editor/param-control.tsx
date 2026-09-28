"use client";

// Generic renderer for a single theme parameter. Maps each `ParamDef.kind` to an
// existing editor primitive, so a theme never writes its own control panel — it
// declares `ParamDef`s (in `lib/`) and these render automatically. The value is
// any stored `ParamValue` at this boundary (the theme body stays strictly typed
// on its own config); each kind parses its own shape as it reads.

import type { CSSProperties } from "react";
import { z } from "zod/mini";

import {
  ControlBlock,
  RichSelect,
  ToggleRow,
} from "@/components/app/control-primitives";
import type { RichSelectOption } from "@/components/app/control-primitives";
import { OptionToggleItem } from "@/components/app/primitives/toggle-group";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type {
  ParamCtx,
  ParamDef,
  ParamOption,
  ParamValue,
} from "@/theme/core/params/kinds";

import { isOptionGlyph, OPTION_GLYPHS } from "./option-glyphs";

interface ParamControlProps {
  ctx: ParamCtx;
  def: ParamDef;
  onChange: (value: ParamValue) => void;
  /** the stored value — absent until the config carries this param */
  value: ParamValue | undefined;
}

// Each kind reads its own shape out of the stored value, falling back to the
// param's default when the stored value is absent or of another kind.
const SLIDER_VALUE = z.number();
const CHOICE_VALUE = z.string();

// Sized to match the editor's other rich selects (the sport picker).
const ICON_PROPS = {
  "aria-hidden": true,
  className: "size-5",
  weight: "duotone",
} as const;

const isPresent = (text: string | undefined): text is string =>
  text !== undefined && text !== "";

/** A palette option's hex colour, read by `bg-(--swatch)`. */
interface SwatchVars extends CSSProperties {
  "--swatch": string;
}

const OptionSwatch = ({ color }: { color: string }) => {
  const swatchVars: SwatchVars = { "--swatch": color };
  return (
    <span
      aria-hidden
      className="border-foreground/25 size-5 rounded-full border bg-(--swatch)"
      style={swatchVars}
    />
  );
};

/** The option's semantic duotone icon, a colour swatch (palette picker), or a
 *  neutral disc — so option rows keep a consistent leading mark. */
const OptionGlyph = ({
  glyph,
  swatch,
}: {
  glyph?: string;
  swatch?: string;
}) => {
  if (glyph !== undefined && isOptionGlyph(glyph)) {
    const GlyphIcon = OPTION_GLYPHS[glyph];
    return <GlyphIcon {...ICON_PROPS} />;
  }
  if (isPresent(swatch)) {
    return <OptionSwatch color={swatch} />;
  }
  return (
    <span
      aria-hidden
      className="border-foreground/30 size-4 rounded-full border"
    />
  );
};

const toRichOption = (o: ParamOption): RichSelectOption => ({
  hint: o.hint ?? (isPresent(o.value) ? undefined : o.blurb),
  icon: <OptionGlyph glyph={o.glyph} swatch={o.swatch} />,
  primary: o.value ?? o.label,
  unit: o.unit,
  value: o.id,
});

const resolveOptions = (
  def: Extract<ParamDef, { kind: "segmented" | "select" }>,
  ctx: ParamCtx
): ParamOption[] =>
  Array.isArray(def.options) ? def.options : def.options(ctx);

export const ParamControl = ({
  def,
  value,
  onChange,
  ctx,
}: ParamControlProps) => {
  if (def.kind === "toggle") {
    return (
      <ToggleRow
        checked={value === true}
        label={def.label}
        onCheckedChange={(c) => {
          onChange(c);
        }}
      />
    );
  }

  if (def.kind === "slider") {
    const stored = SLIDER_VALUE.safeParse(value);
    const n = stored.success ? stored.data : def.default;
    return (
      <ControlBlock label={def.label}>
        <div className="mt-3 flex items-center gap-4">
          <Slider
            aria-label={def.label}
            className="flex-1"
            max={def.max}
            min={def.min}
            onValueChange={(v: number | readonly number[]) => {
              // Flatten the scalar-or-array payload (`Array.isArray` would widen
              // the readonly array to `any[]`) and take its first thumb.
              const next = [v].flat()[0] ?? 0;
              onChange(Math.round(next));
            }}
            step={def.step ?? 1}
            value={[n]}
          />
          <span className="w-12 text-right font-mono text-xs font-medium tabular-nums opacity-70">
            {n}
            {def.unit ?? ""}
          </span>
        </div>
      </ControlBlock>
    );
  }

  const options = resolveOptions(def, ctx);
  const stored = CHOICE_VALUE.safeParse(value);
  const current = stored.success ? stored.data : def.default;

  if (def.kind === "select") {
    return (
      <ControlBlock label={def.label}>
        <RichSelect
          ariaLabel={def.label}
          className="mt-2"
          onValueChange={onChange}
          options={options.map(toRichOption)}
          value={current}
        />
      </ControlBlock>
    );
  }

  // segmented
  const cols = options.length <= 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <ControlBlock label={def.label}>
      <ToggleGroup
        aria-label={def.label}
        className={cn("mt-2 grid w-full", cols)}
        onValueChange={(values) => {
          if (values[0]) {
            onChange(values[0]);
          }
        }}
        spacing={2}
        value={[current]}
        variant="outline"
      >
        {options.map((o) => (
          <OptionToggleItem
            aria-label={o.label}
            key={o.id}
            look="tile"
            value={o.id}
          >
            <div className="font-heading text-base leading-none uppercase">
              {o.label}
            </div>
            {isPresent(o.blurb) ? (
              <div className="caption-micro mt-1">{o.blurb}</div>
            ) : null}
          </OptionToggleItem>
        ))}
      </ToggleGroup>
    </ControlBlock>
  );
};
