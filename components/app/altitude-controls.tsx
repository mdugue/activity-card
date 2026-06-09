"use client";

// Parameter controls for the Altitude theme (single card). Rendered in the
// editor's `slotAfterPhoto`. Drives the `AltitudeConfig` object held in app
// state; the pure model + labels live in `@/lib/altitude`.

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
import {
  type AltitudeClaim,
  type AltitudeClaimStyle,
  type AltitudeConfig,
  type AltitudeFont,
  type AltitudePosition,
  CLAIM_LABELS,
  claimOptions,
  resolveClaim,
} from "@/lib/altitude";
import {
  ControlBlock,
  RichSelect,
  type RichSelectOption,
  ToggleRow,
} from "./control-primitives";
import type { ActivityData } from "./sample-data";

const NONE_VALUE = "__none__";

// Duotone glyph per headline metric, sized to match the rest of the editor.
const ICON_PROPS = {
  "aria-hidden": true,
  className: "size-5",
  weight: "duotone",
} as const;

const CLAIM_ICONS: Record<AltitudeClaim, React.ReactNode> = {
  elevation: <MountainsIcon {...ICON_PROPS} />,
  distance: <PathIcon {...ICON_PROPS} />,
  name: <TextAaIcon {...ICON_PROPS} />,
  duration: <ClockIcon {...ICON_PROPS} />,
  avgSpeed: <GaugeIcon {...ICON_PROPS} />,
  maxSpeed: <LightningIcon {...ICON_PROPS} />,
  pace: <TimerIcon {...ICON_PROPS} />,
};

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
  const hasClaim = config.claim !== null;
  const showOpacity = hasClaim && config.claimStyle === "cutout";

  // Each option carries the metric's actual value first-class (e.g. "1240" +
  // "m") with the metric name as a muted sidenote. `claimOptions` only returns
  // metrics this activity has, so `resolveClaim` lands on each claim's own stat.
  const headlineOptions: RichSelectOption[] = claimOptions(data).map((c) => {
    const stat = resolveClaim(c, data);
    return {
      value: c,
      icon: CLAIM_ICONS[c],
      primary: stat?.value ?? CLAIM_LABELS[c],
      unit: stat?.unit || undefined,
      hint: stat?.label ?? CLAIM_LABELS[c],
    };
  });
  headlineOptions.push({
    value: NONE_VALUE,
    icon: <CircleDashedIcon {...ICON_PROPS} />,
    primary: "None",
    hint: "No headline",
  });

  return (
    <>
      <ControlBlock label="HEADLINE">
        <RichSelect
          ariaLabel="Headline"
          className="mt-2"
          onValueChange={(v) =>
            onChange({
              ...config,
              claim: v === NONE_VALUE ? null : (v as AltitudeClaim),
            })
          }
          options={headlineOptions}
          value={config.claim ?? NONE_VALUE}
        />
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
