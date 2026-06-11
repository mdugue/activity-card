"use client";

// Generic renderer for a single theme parameter. Maps each `ParamDef.kind` to an
// existing editor primitive, so a theme never writes its own control panel — it
// declares `ParamDef`s (in `lib/`) and these render automatically. The value is
// `unknown` at this boundary (the theme body stays strictly typed on its own
// config); each kind narrows it as it reads.

import {
  CircleDashedIcon,
  ClockIcon,
  GaugeIcon,
  LightningIcon,
  MountainsIcon,
  PathIcon,
  TextAaIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ParamCtx, ParamDef, ParamOption } from "@/lib/params/kinds";
import { cn } from "@/lib/utils";
import {
  ControlBlock,
  RichSelect,
  type RichSelectOption,
  ToggleRow,
} from "./control-primitives";

interface ParamControlProps {
  ctx: ParamCtx;
  def: ParamDef;
  onChange: (value: unknown) => void;
  value: unknown;
}

// Duotone glyph per option `glyph` id, sized to match the editor's other rich
// selects (the sport picker). The map lives here — not on the `ParamOption` —
// so param specs in `lib/` stay JSX-free.
const ICON_PROPS = {
  "aria-hidden": true,
  className: "size-5",
  weight: "duotone",
} as const;

export const OPTION_GLYPHS: Record<string, React.ReactNode> = {
  elevation: <MountainsIcon {...ICON_PROPS} />,
  distance: <PathIcon {...ICON_PROPS} />,
  name: <TextAaIcon {...ICON_PROPS} />,
  duration: <ClockIcon {...ICON_PROPS} />,
  avgSpeed: <GaugeIcon {...ICON_PROPS} />,
  maxSpeed: <LightningIcon {...ICON_PROPS} />,
  pace: <TimerIcon {...ICON_PROPS} />,
  none: <CircleDashedIcon {...ICON_PROPS} />,
};

/** The option's semantic duotone icon, a colour swatch (palette picker), or a
 *  neutral disc — so option rows keep a consistent leading mark. */
function OptionGlyph({ glyph, swatch }: { glyph?: string; swatch?: string }) {
  const icon = glyph ? OPTION_GLYPHS[glyph] : undefined;
  if (icon) {
    return icon;
  }
  if (swatch) {
    return (
      <span
        aria-hidden
        className="size-5 rounded-full border border-foreground/25"
        style={{ background: swatch }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="size-4 rounded-full border border-foreground/30"
    />
  );
}

function toRichOption(o: ParamOption): RichSelectOption {
  return {
    value: o.id,
    icon: <OptionGlyph glyph={o.glyph} swatch={o.swatch} />,
    primary: o.value ?? o.label,
    unit: o.unit,
    hint: o.hint ?? (o.value ? undefined : o.blurb),
  };
}

function resolveOptions(
  def: Extract<ParamDef, { kind: "segmented" | "select" }>,
  ctx: ParamCtx
): ParamOption[] {
  return typeof def.options === "function" ? def.options(ctx) : def.options;
}

export function ParamControl({ def, value, onChange, ctx }: ParamControlProps) {
  if (def.kind === "toggle") {
    return (
      <ToggleRow
        checked={value === true}
        label={def.label}
        onCheckedChange={(c) => onChange(c)}
      />
    );
  }

  if (def.kind === "slider") {
    const n = typeof value === "number" ? value : def.default;
    return (
      <ControlBlock label={def.label}>
        <div className="mt-3 flex items-center gap-4">
          <Slider
            aria-label={def.label}
            className="flex-1"
            max={def.max}
            min={def.min}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v;
              onChange(Math.round(Number(next)));
            }}
            step={def.step ?? 1}
            value={[n]}
          />
          <span className="w-12 text-right font-medium font-mono text-xs tabular-nums opacity-70">
            {n}
            {def.unit ?? ""}
          </span>
        </div>
      </ControlBlock>
    );
  }

  const options = resolveOptions(def, ctx);
  const current = typeof value === "string" ? value : def.default;

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
        className={cn("mt-2 grid w-full gap-2", cols)}
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
          <ToggleGroupItem
            aria-label={o.label}
            className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
            key={o.id}
            value={o.id}
          >
            <div className="font-heading text-base uppercase leading-none">
              {o.label}
            </div>
            {o.blurb ? (
              <div className="caption-micro mt-1">{o.blurb}</div>
            ) : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </ControlBlock>
  );
}
