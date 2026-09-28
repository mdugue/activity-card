import type { ParamDef, ParamGroup } from "@/theme/core/params/kinds";

/** Whether a theme *declares* any param in a group — drives whether the builder
 *  creates that category's tab at all (independent of `visibleWhen`, so a tab
 *  doesn't flicker as conditional params toggle). */
export const themeDeclaresGroup = (
  params: ParamDef[],
  group: ParamGroup
): boolean => params.some((p) => p.group === group);
