// Resilient config coercion. Given a theme's defaults + param specs and a raw
// (possibly stale / hand-edited / garbage) value, return a valid config: start
// from the defaults, then accept each persisted field only when it matches its
// param's kind and constraints (booleans for toggles, finite + clamped numbers
// for sliders, a known option id for choices). Unknown keys are dropped. This is
// the single place stale localStorage is made safe — replacing the scattered
// `{ ...DEFAULT, ...persisted }` merges that let a bad enum slip through.

import { z } from "zod/mini";

import type { ChoiceParam, ParamDef, ParamValue, ThemeConfig } from "./kinds";

/** A persisted config before coercion: any plain object, values unchecked. */
const rawConfigSchema = z.record(z.string(), z.unknown());
type RawConfig = z.infer<typeof rawConfigSchema>;

const toggleSchema = z.boolean();
const sliderSchema = z.number();
const choiceSchema = z.string();

/** The fixed id space for a choice param, or null when it can't be known
 *  statically (a dynamic option set with no declared `optionIds`). */
const optionIdSet = (p: ChoiceParam): Set<string> | null => {
  if (p.optionIds) {
    return new Set(p.optionIds);
  }
  if (Array.isArray(p.options)) {
    return new Set(p.options.map((o) => o.id));
  }
  return null;
};

/** The accepted value for one param, or `null` when the raw value is
 *  missing / mistyped / out of range / an unknown option id. */
const coerceValue = (p: ParamDef, source: RawConfig): ParamValue | null => {
  const raw = source[p.id];
  if (p.kind === "toggle") {
    const parsed = toggleSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }
  if (p.kind === "slider") {
    const parsed = sliderSchema.safeParse(raw);
    return parsed.success && Number.isFinite(parsed.data)
      ? Math.min(p.max, Math.max(p.min, parsed.data))
      : null;
  }
  // choice — accept only a known option id
  const parsed = choiceSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const ids = optionIdSet(p);
  return ids === null || ids.has(parsed.data) ? parsed.data : null;
};

export const coerceConfig = <C extends ThemeConfig>(
  defaults: C,
  params: ParamDef[],
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- this IS the I/O boundary parser: persisted localStorage / story args arrive untyped and are decoded here
  raw: unknown
): C => {
  const source = rawConfigSchema.safeParse(raw);
  if (!source.success) {
    return { ...defaults };
  }
  const accepted: ThemeConfig = {};
  for (const p of params) {
    const v = coerceValue(p, source.data);
    if (v !== null) {
      accepted[p.id] = v;
    }
  }
  return { ...defaults, ...accepted };
};
