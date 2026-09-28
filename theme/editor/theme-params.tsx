"use client";

// Renders a theme's parameters for one editor category. The toolbar builder asks
// for the controls in each `ParamGroup`; this filters the theme's `ParamDef`s to
// that group (honouring `visibleWhen`) and renders each via `ParamControl`. This
// is what replaces the per-theme `*-controls.tsx` files and the `moodControl`
// special-casing — every theme's knobs flow through one generic path.

import type {
  ParamCtx,
  ParamDef,
  ParamGroup,
  ThemeConfig,
} from "@/theme/core/params/kinds";

import { ParamControl } from "./param-control";

interface ThemeParamGroupProps {
  config: ThemeConfig;
  ctx: ParamCtx;
  group: ParamGroup;
  onChange: (next: ThemeConfig) => void;
  params: ParamDef[];
}

/** The controls for one category, or `null` when the theme has none visible. */
export const ThemeParamGroup = ({
  params,
  config,
  ctx,
  group,
  onChange,
}: ThemeParamGroupProps) => {
  const inGroup = params.filter(
    (p) => p.group === group && (p.visibleWhen?.(config) ?? true)
  );
  if (inGroup.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-5">
      {inGroup.map((p) => (
        <ParamControl
          ctx={ctx}
          def={p}
          key={p.id}
          onChange={(value) => {
            onChange({ ...config, [p.id]: value });
          }}
          value={config[p.id]}
        />
      ))}
    </div>
  );
};
