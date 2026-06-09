"use client";

// Parameter controls for the STRATA theme (single card). Rendered in the
// editor's MOOD tool; drives the `StrataConfig` held in app state. The model and
// the poetic labels/blurbs live in `@/lib/strata`. Mirrors the Altitude and
// photo-mood control patterns so the sidebar reads consistently.

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  STRATA_DENSITY_BLURBS,
  STRATA_DENSITY_LABELS,
  STRATA_MOOD_BLURBS,
  STRATA_MOOD_LABELS,
  type StrataConfig,
  type StrataDensity,
  type StrataMood,
} from "@/lib/strata";
import { ControlBlock, ToggleRow } from "./control-primitives";

const MOODS: StrataMood[] = ["paper", "dawn", "dusk", "midnight", "alpine"];
const DENSITIES: StrataDensity[] = ["fine", "woven", "bold"];

interface StrataControlsProps {
  config: StrataConfig;
  onChange: (next: StrataConfig) => void;
}

export function StrataControls({ config, onChange }: StrataControlsProps) {
  return (
    <>
      <ControlBlock label="MOOD">
        <ToggleGroup
          aria-label="Mood"
          className="mt-2 grid w-full grid-cols-3 gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              onChange({ ...config, mood: values[0] as StrataMood });
            }
          }}
          spacing={2}
          value={[config.mood]}
          variant="outline"
        >
          {MOODS.map((m) => (
            <ToggleGroupItem
              aria-label={STRATA_MOOD_LABELS[m]}
              className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
              key={m}
              value={m}
            >
              <div className="font-heading text-base uppercase leading-none">
                {STRATA_MOOD_LABELS[m]}
              </div>
              <div className="caption-micro mt-1">{STRATA_MOOD_BLURBS[m]}</div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ControlBlock>

      <ControlBlock label="DENSITY">
        <ToggleGroup
          aria-label="Density"
          className="mt-2 grid w-full grid-cols-3 gap-2"
          onValueChange={(values) => {
            if (values[0]) {
              onChange({ ...config, density: values[0] as StrataDensity });
            }
          }}
          spacing={2}
          value={[config.density]}
          variant="outline"
        >
          {DENSITIES.map((d) => (
            <ToggleGroupItem
              aria-label={STRATA_DENSITY_LABELS[d]}
              className="flex h-auto flex-col items-start justify-start px-3 py-2.5 text-left"
              key={d}
              value={d}
            >
              <div className="font-heading text-base uppercase leading-none">
                {STRATA_DENSITY_LABELS[d]}
              </div>
              <div className="caption-micro mt-1">
                {STRATA_DENSITY_BLURBS[d]}
              </div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ControlBlock>

      <ControlBlock label="MARKERS">
        <div className="mt-2">
          <ToggleRow
            checked={config.legend}
            label="Peak height & direction arrow"
            onCheckedChange={(c) => onChange({ ...config, legend: c })}
          />
        </div>
      </ControlBlock>
    </>
  );
}
