"use client";

// Renders a theme's parameters for one editor category. The toolbar builder asks
// for the controls in each `ParamGroup`; this filters the theme's `ParamDef`s to
// that group (honouring `visibleWhen`) and renders each via `ParamControl`. This
// is what replaces the per-theme `*-controls.tsx` files and the `moodControl`
// special-casing — every theme's knobs flow through one generic path.

import type { ParamCtx, ParamDef, ParamGroup } from "@/theme/core/params/kinds";
import { ParamControl } from "./param-control";

interface ThemeParamGroupProps {
  config: Record<string, unknown>;
  ctx: ParamCtx;
  group: ParamGroup;
  onChange: (next: Record<string, unknown>) => void;
  params: ParamDef[];
}

/** The controls for one category, or `null` when the theme has none visible. */
export function ThemeParamGroup({
  params,
  config,
  ctx,
  group,
  onChange,
}: ThemeParamGroupProps) {
  const inGroup = params.filter(
    (p) => p.group === group && (!p.visibleWhen || p.visibleWhen(config))
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
          onChange={(value) => onChange({ ...config, [p.id]: value })}
          value={config[p.id]}
        />
      ))}
    </div>
  );
}

/** Whether a theme *declares* any param in a group — drives whether the builder
 *  creates that category's tab at all (independent of `visibleWhen`, so a tab
 *  doesn't flicker as conditional params toggle). */
export function themeDeclaresGroup(
  params: ParamDef[],
  group: ParamGroup
): boolean {
  return params.some((p) => p.group === group);
}
