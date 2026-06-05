"use client";

// Parameter controls for the Altitude theme (single card). Rendered in the
// editor's `slotAfterPhoto`. Drives the `AltitudeConfig` object held in app
// state; the pure model + labels live in `@/lib/altitude`.

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type AltitudeClaim,
  type AltitudeClaimStyle,
  type AltitudeConfig,
  type AltitudeFont,
  type AltitudePosition,
  CLAIM_LABELS,
  claimOptions,
} from "@/lib/altitude";
import { ControlBlock, ToggleRow } from "./control-primitives";
import type { ActivityData } from "./sample-data";

const NONE_VALUE = "__none__";

const FONT_OPTIONS: { id: AltitudeFont; label: string; sub: string }[] = [
  { id: "modern", label: "MODERN", sub: "bold condensed" },
  { id: "serif", label: "SERIF", sub: "elegant" },
];

const POSITION_OPTIONS: { id: AltitudePosition; label: string }[] = [
  { id: "top", label: "TOP" },
  { id: "center", label: "CENTER" },
  { id: "bottom", label: "BOTTOM" },
];

const STYLE_OPTIONS: { id: AltitudeClaimStyle; label: string; sub: string }[] =
  [
    { id: "cutout", label: "CUTOUT", sub: "line through type" },
    { id: "stacked", label: "STACKED", sub: "line below" },
  ];

interface AltitudeControlsProps {
  config: AltitudeConfig;
  data: ActivityData;
  onChange: (next: AltitudeConfig) => void;
}

export function AltitudeControls({
  config,
  data,
  onChange,
}: AltitudeControlsProps) {
  const claims = claimOptions(data);
  const hasClaim = config.claim !== null;
  const showOpacity = hasClaim && config.claimStyle === "cutout";

  return (
    <>
      <ControlBlock label="HEADLINE">
        <Select
          onValueChange={(v) =>
            onChange({
              ...config,
              claim: v === NONE_VALUE ? null : (v as AltitudeClaim),
            })
          }
          value={config.claim ?? NONE_VALUE}
        >
          <SelectTrigger aria-label="Headline" className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {claims.map((c) => (
              <SelectItem key={c} value={c}>
                {CLAIM_LABELS[c]}
              </SelectItem>
            ))}
            <SelectItem value={NONE_VALUE}>None</SelectItem>
          </SelectContent>
        </Select>
      </ControlBlock>

      <ControlBlock label="FONT">
        <ToggleGroup
          aria-label="Headline font"
          className="mt-2 grid w-full grid-cols-2 gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              onChange({ ...config, font: values[0] as AltitudeFont });
            }
          }}
          spacing={2}
          value={[config.font]}
          variant="outline"
        >
          {FONT_OPTIONS.map((o) => (
            <ToggleGroupItem
              aria-label={o.label}
              className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
              key={o.id}
              value={o.id}
            >
              <div className="font-heading text-base uppercase leading-none">
                {o.label}
              </div>
              <div className="caption-micro mt-1">{o.sub}</div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ControlBlock>

      <ControlBlock label="POSITION">
        <ToggleGroup
          aria-label="Headline position"
          className="mt-2 grid w-full grid-cols-3 gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              onChange({ ...config, position: values[0] as AltitudePosition });
            }
          }}
          spacing={2}
          value={[config.position]}
          variant="outline"
        >
          {POSITION_OPTIONS.map((o) => (
            <ToggleGroupItem
              aria-label={o.label}
              className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
              key={o.id}
              value={o.id}
            >
              <div className="font-heading text-base uppercase leading-none">
                {o.label}
              </div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ControlBlock>

      {hasClaim ? (
        <ControlBlock label="TREATMENT">
          <ToggleGroup
            aria-label="Headline treatment"
            className="mt-2 grid w-full grid-cols-2 gap-2"
            onValueChange={(values) => {
              if (values[0]) {
                onChange({
                  ...config,
                  claimStyle: values[0] as AltitudeClaimStyle,
                });
              }
            }}
            spacing={2}
            value={[config.claimStyle]}
            variant="outline"
          >
            {STYLE_OPTIONS.map((o) => (
              <ToggleGroupItem
                aria-label={o.label}
                className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
                key={o.id}
                value={o.id}
              >
                <div className="font-heading text-base uppercase leading-none">
                  {o.label}
                </div>
                <div className="caption-micro mt-1">{o.sub}</div>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ControlBlock>
      ) : null}

      {showOpacity ? (
        <ControlBlock label="CUTOUT OPACITY">
          <div className="mt-3 flex items-center gap-4">
            <Slider
              aria-label="Cutout opacity"
              className="flex-1"
              max={100}
              min={0}
              onValueChange={(value) => {
                const n = Array.isArray(value) ? value[0] : value;
                onChange({ ...config, cutoutOpacity: Math.round(Number(n)) });
              }}
              step={1}
              value={[config.cutoutOpacity]}
            />
            <span className="w-12 text-right font-medium font-mono text-xs tabular-nums opacity-70">
              {config.cutoutOpacity}%
            </span>
          </div>
        </ControlBlock>
      ) : null}

      <ControlBlock label="SUPPORTING STATS">
        <div className="mt-2">
          <ToggleRow
            checked={config.secondLine}
            label="Second line of stats"
            onCheckedChange={(c) => onChange({ ...config, secondLine: c })}
          />
        </div>
      </ControlBlock>
    </>
  );
}
