// Resilient config coercion. Given a theme's defaults + param specs and a raw
// (possibly stale / hand-edited / garbage) value, return a valid config: start
// from the defaults, then accept each persisted field only when it matches its
// param's kind and constraints (booleans for toggles, finite + clamped numbers
// for sliders, a known option id for choices). Unknown keys are dropped. This is
// the single place stale localStorage is made safe — replacing the scattered
// `{ ...DEFAULT, ...persisted }` merges that let a bad enum slip through.

import type { ChoiceParam, ParamDef } from "./kinds";

/** The fixed id space for a choice param, or null when it can't be known
 *  statically (a dynamic option set with no declared `optionIds`). */
function optionIdSet(p: ChoiceParam): Set<string> | null {
  if (p.optionIds) {
    return new Set(p.optionIds);
  }
  if (Array.isArray(p.options)) {
    return new Set(p.options.map((o) => o.id));
  }
  return null;
}

/** The accepted value for one param, or `undefined` when the raw value is
 *  missing / mistyped / out of range / an unknown option id. */
function coerceValue(p: ParamDef, v: unknown): unknown {
  if (p.kind === "toggle") {
    return typeof v === "boolean" ? v : undefined;
  }
  if (p.kind === "slider") {
    return typeof v === "number" && Number.isFinite(v)
      ? Math.min(p.max, Math.max(p.min, v))
      : undefined;
  }
  // choice — accept only a known option id
  const ids = optionIdSet(p);
  return typeof v === "string" && (!ids || ids.has(v)) ? v : undefined;
}

export function coerceConfig<C extends Record<string, unknown>>(
  defaults: C,
  params: ParamDef[],
  raw: unknown
): C {
  const out: C = { ...defaults };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return out;
  }
  const r = raw as Record<string, unknown>;
  for (const p of params) {
    if (!(p.id in r)) {
      continue;
    }
    const v = coerceValue(p, r[p.id]);
    if (v !== undefined) {
      out[p.id as keyof C] = v as C[keyof C];
    }
  }
  return out;
}
