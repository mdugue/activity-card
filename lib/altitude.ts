/**
 * Altitude theme — configuration model and pure stat resolution.
 *
 * Kept JSX-free (and out of the component) so the claim/supporting-stat logic
 * is unit-testable under `bun:test`. The component in
 * `components/themes/altitude.tsx` consumes the config; the editor renders
 * `ALTITUDE_PARAMS` generically (see `lib/params/` + `components/app/param-control.tsx`).
 *
 * Values are formatted here via `lib/format.ts` so the theme renders strings
 * directly. English/metric formatting, consistent with every other theme.
 */

import type { Sport } from "@/lib/activity";
import {
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import type { ParamDef, ParamOption } from "@/lib/params/kinds";
import type { ActivityView } from "@/lib/theme-contract";

/** Display typeface for the claim. */
export type AltitudeFont = "modern" | "serif";

/** Which hero metric (or the activity name) the claim renders. */
export type AltitudeClaim =
  | "elevation"
  | "distance"
  | "name"
  | "avgSpeed"
  | "maxSpeed"
  | "duration"
  | "pace";

/** The stored headline choice: a metric, or `"none"` for no claim (line +
 *  supporting stats only). Kept a plain string (not `AltitudeClaim | null`) so
 *  the config is fully serialisable / param-schema friendly. */
export type AltitudeHeadline = AltitudeClaim | "none";

/** Vertical anchor of the claim cluster. */
export type AltitudePosition = "top" | "center" | "bottom";

/** How the claim relates to the elevation line. */
export type AltitudeClaimStyle = "cutout" | "stacked";

// Extends Record so the config flows through the generic param registry /
// coercer without casts; declared keys keep their precise types.
export interface AltitudeConfig extends Record<string, unknown> {
  /** The hero metric, or `"none"` to show no claim (line + supporting stats only). */
  claim: AltitudeHeadline;
  claimStyle: AltitudeClaimStyle;
  /** 0–100. Only meaningful when `claimStyle === "cutout"`. */
  cutoutOpacity: number;
  font: AltitudeFont;
  position: AltitudePosition;
  /** Show two supporting stats under the claim. */
  secondLine: boolean;
}

export const DEFAULT_ALTITUDE_CONFIG: AltitudeConfig = {
  claim: "elevation",
  claimStyle: "cutout",
  cutoutOpacity: 20,
  font: "modern",
  position: "bottom",
  secondLine: true,
};

/** Superset of claims plus the extra metrics only the supporting line uses. */
export type StatKey = AltitudeClaim | "heartRate" | "swolf" | "cadence" | "vam";

export interface ResolvedStat {
  /** `true` when the value is free text (the activity name), not a number. */
  isText: boolean;
  /** Short uppercase label, e.g. "ELEV GAIN" (shown in the stacked treatment). */
  label: string;
  /** Unit suffix, e.g. "m", "km", "km/h", "/km". Empty for name/time. */
  unit: string;
  /** Formatted value, e.g. "1240", "87.3", "Saturday ride". */
  value: string;
}

export interface ResolvedClaim extends ResolvedStat {
  /** The metric actually rendered (may differ from the request after fallback). */
  key: StatKey;
}

const isNum = (n: number | undefined): n is number =>
  n !== undefined && Number.isFinite(n);

type StatBuilder = (data: ActivityView) => ResolvedStat | null;

/** One builder per metric key; each returns null when its field is absent. */
const STAT_BUILDERS: Record<StatKey, StatBuilder> = {
  name: (data) => {
    const v = data.title?.trim();
    return v ? { value: v, unit: "", label: "ACTIVITY", isText: true } : null;
  },
  elevation: (data) =>
    isNum(data.elevationGainM)
      ? {
          value: formatNumber(data.elevationGainM),
          unit: "m",
          label: "ELEV GAIN",
          isText: false,
        }
      : null,
  distance: (data) => {
    if (!isNum(data.distanceKm)) {
      return null;
    }
    return data.sport === "swim"
      ? {
          value: formatNumber(data.distanceKm * 1000),
          unit: "m",
          label: "DISTANCE",
          isText: false,
        }
      : {
          value: data.distanceKm.toFixed(1),
          unit: "km",
          label: "DISTANCE",
          isText: false,
        };
  },
  avgSpeed: (data) =>
    isNum(data.avgSpeedKmh)
      ? {
          value: formatNumber(data.avgSpeedKmh, 1),
          unit: "km/h",
          label: "AVG SPEED",
          isText: false,
        }
      : null,
  maxSpeed: (data) =>
    isNum(data.maxSpeedKmh)
      ? {
          value: formatNumber(data.maxSpeedKmh, 1),
          unit: "km/h",
          label: "MAX SPEED",
          isText: false,
        }
      : null,
  duration: (data) =>
    isNum(data.durationSec)
      ? {
          value: formatDuration(data.durationSec),
          unit: "",
          label: "TIME",
          isText: false,
        }
      : null,
  pace: (data) => {
    if (data.sport === "swim" && isNum(data.avgPacePer100m)) {
      return {
        value: formatPaceSec(data.avgPacePer100m),
        unit: "/100m",
        label: "PACE",
        isText: false,
      };
    }
    return isNum(data.avgPaceMinPerKm)
      ? {
          value: formatPaceMin(data.avgPaceMinPerKm),
          unit: "/km",
          label: "PACE",
          isText: false,
        }
      : null;
  },
  heartRate: (data) =>
    isNum(data.avgHeartRate)
      ? {
          value: formatNumber(data.avgHeartRate),
          unit: "bpm",
          label: "AVG HR",
          isText: false,
        }
      : null,
  swolf: (data) =>
    isNum(data.swolf)
      ? {
          value: formatNumber(data.swolf),
          unit: "",
          label: "SWOLF",
          isText: false,
        }
      : null,
  cadence: (data) =>
    isNum(data.avgCadence)
      ? {
          value: formatNumber(data.avgCadence),
          unit: "spm",
          label: "CADENCE",
          isText: false,
        }
      : null,
  vam: (data) =>
    isNum(data.vamMph)
      ? {
          value: formatNumber(data.vamMph),
          unit: "m/h",
          label: "VAM",
          isText: false,
        }
      : null,
};

/** Build a stat for one metric key, or `null` when the data isn't present. */
function metricStat(key: StatKey, data: ActivityView): ResolvedStat | null {
  return STAT_BUILDERS[key](data);
}

/** Order the headline picker offers, before filtering to what's available. */
const CLAIM_PICKER_ORDER: AltitudeClaim[] = [
  "elevation",
  "distance",
  "name",
  "duration",
  "avgSpeed",
  "maxSpeed",
  "pace",
];

/** Sensible substitutes when the requested claim isn't available. */
const CLAIM_FALLBACK: StatKey[] = ["elevation", "distance", "duration"];

/** Two-stat supporting line: sport-relevant, claim excluded, missing skipped. */
const SUPPORTING_PRIORITY: Record<Sport, StatKey[]> = {
  ride: ["distance", "elevation", "avgSpeed", "duration", "vam", "maxSpeed"],
  run: ["distance", "pace", "duration", "heartRate"],
  swim: ["distance", "pace", "duration", "swolf"],
  triathlon: ["distance", "duration", "elevation", "heartRate"],
};

/** User-facing labels for the headline picker. */
export const CLAIM_LABELS: Record<AltitudeClaim, string> = {
  elevation: "Elevation",
  distance: "Distance",
  name: "Name",
  duration: "Time",
  avgSpeed: "Avg speed",
  maxSpeed: "Max speed",
  pace: "Pace",
};

/**
 * Resolve the claim to a renderable stat, falling back to the first sensible
 * available metric when the requested one is missing (stripped by a visibility
 * toggle, or absent for the sport). Returns `null` only when `claim` is `null`.
 */
export function resolveClaim(
  claim: AltitudeHeadline,
  data: ActivityView
): ResolvedClaim | null {
  if (claim === "none") {
    return null;
  }
  const order: StatKey[] = [
    claim,
    ...CLAIM_FALLBACK.filter((k) => k !== claim),
    "distance",
  ];
  for (const key of order) {
    const stat = metricStat(key, data);
    if (stat) {
      return { key, ...stat };
    }
  }
  return null;
}

/**
 * Up to `max` supporting stats for the second line, in sport priority order,
 * skipping `excludeKey` (whatever the claim already shows) and any field the
 * activity doesn't have.
 */
export function supportingStats(
  data: ActivityView,
  excludeKey: StatKey | null,
  max = 2
): ResolvedStat[] {
  const out: ResolvedStat[] = [];
  for (const key of SUPPORTING_PRIORITY[data.sport]) {
    if (out.length >= max) {
      break;
    }
    if (key === excludeKey) {
      continue;
    }
    const stat = metricStat(key, data);
    if (stat) {
      out.push(stat);
    }
  }
  return out;
}

/** Headline options that resolve to real data for this activity. */
export function claimOptions(data: ActivityView): AltitudeClaim[] {
  return CLAIM_PICKER_ORDER.filter((k) =>
    k === "name" ? Boolean(data.title?.trim()) : metricStat(k, data) !== null
  );
}

/* ---------------------------- parameter schema ---------------------------- */
// LAYOUT controls for the editor. The headline is a *calculated* select — only
// the metrics this activity has, each showing its live value first-class (this
// is the data-dependent `options(ctx)` case). The rest are fixed choices.
// Treatment and cutout opacity are conditional (no claim → no treatment; only
// the cutout treatment has an opacity).

const ALL_HEADLINES: readonly AltitudeHeadline[] = [
  "elevation",
  "distance",
  "name",
  "avgSpeed",
  "maxSpeed",
  "duration",
  "pace",
  "none",
];

export const ALTITUDE_PARAMS: ParamDef[] = [
  {
    id: "claim",
    group: "layout",
    label: "HEADLINE",
    kind: "select",
    default: DEFAULT_ALTITUDE_CONFIG.claim,
    optionIds: ALL_HEADLINES,
    options: (ctx): ParamOption[] => {
      const opts: ParamOption[] = claimOptions(ctx.data).map((c) => {
        const stat = resolveClaim(c, ctx.data);
        return {
          id: c,
          label: CLAIM_LABELS[c],
          value: stat?.value ?? CLAIM_LABELS[c],
          unit: stat?.unit || undefined,
          hint: stat?.label ?? CLAIM_LABELS[c],
        };
      });
      opts.push({
        id: "none",
        label: "None",
        value: "None",
        hint: "No headline",
      });
      return opts;
    },
  },
  {
    id: "font",
    group: "layout",
    label: "FONT",
    kind: "segmented",
    default: DEFAULT_ALTITUDE_CONFIG.font,
    options: [
      { id: "modern", label: "MODERN", blurb: "bold condensed" },
      { id: "serif", label: "SERIF", blurb: "elegant" },
    ],
  },
  {
    id: "position",
    group: "layout",
    label: "POSITION",
    kind: "segmented",
    default: DEFAULT_ALTITUDE_CONFIG.position,
    options: [
      { id: "top", label: "TOP" },
      { id: "center", label: "CENTER" },
      { id: "bottom", label: "BOTTOM" },
    ],
  },
  {
    id: "claimStyle",
    group: "layout",
    label: "TREATMENT",
    kind: "segmented",
    default: DEFAULT_ALTITUDE_CONFIG.claimStyle,
    visibleWhen: (cfg) => cfg.claim !== "none",
    options: [
      { id: "cutout", label: "CUTOUT", blurb: "line through type" },
      { id: "stacked", label: "STACKED", blurb: "line below" },
    ],
  },
  {
    id: "cutoutOpacity",
    group: "layout",
    label: "CUTOUT OPACITY",
    kind: "slider",
    default: DEFAULT_ALTITUDE_CONFIG.cutoutOpacity,
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
    visibleWhen: (cfg) => cfg.claim !== "none" && cfg.claimStyle === "cutout",
  },
  {
    id: "secondLine",
    group: "layout",
    label: "Second line of stats",
    kind: "toggle",
    default: DEFAULT_ALTITUDE_CONFIG.secondLine,
  },
];

// ---------------------------------------------------------------------------
// Claim type-setting. The hero is drawn as SVG <text>, so we can't rely on the
// browser to wrap or fit it — we size it analytically instead. `ADVANCE` is the
// average glyph advance as a fraction of the font size for each face (measured
// empirically and tuned against renders); it lets us estimate a string's width
// without a DOM measure, which keeps the result deterministic and export-safe.
// ---------------------------------------------------------------------------

const ADVANCE: Record<AltitudeFont, number> = {
  modern: 0.5, // Anton — heavy + condensed
  serif: 0.55, // Playfair Display
};

/** Largest hero height (px) we allow, so a 1–2 char value can't fill the card. */
const MAX_FONT = 560;
const MIN_FONT = 40;
/** Below this single-line size a name is wrapped instead of shrunk further. */
const WRAP_MIN_FONT = 150;
/** A single line is justified to the full width once it's at least this full. */
const FILL_RATIO = 0.86;
const MAX_LINES = 3;
const WHITESPACE = /\s+/;

export interface ClaimLayout {
  /** Stretch the (single) line to exactly the content width. */
  fill: boolean;
  fontSize: number;
  lines: string[];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Greedy, length-balanced split of `words` into `n` lines. */
function balanceLines(words: string[], n: number): string[] {
  const total = words.reduce((a, w) => a + w.length + 1, -1);
  const target = total / n;
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && next.length > target && lines.length < n - 1) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) {
    lines.push(cur);
  }
  return lines;
}

/**
 * Size (and, for long names, wrap) the hero text so it reads as large as
 * possible across the given content width. Numbers never wrap; names wrap on
 * whitespace once a single line would be too small to be a hero.
 */
export function layoutClaim(
  text: string,
  font: AltitudeFont,
  isText: boolean,
  contentW: number
): ClaimLayout {
  const adv = ADVANCE[font];
  const units = (s: string) => Math.max(1, s.trim().length) * adv;
  const oneLineFont = contentW / units(text);

  // Numbers, short text, or anything with no spaces: a single line.
  if (!isText || oneLineFont >= WRAP_MIN_FONT || !text.trim().includes(" ")) {
    const fontSize = clamp(oneLineFont, MIN_FONT, MAX_FONT);
    const natural = units(text) * fontSize;
    return { lines: [text], fontSize, fill: natural >= contentW * FILL_RATIO };
  }

  // Long name: find the fewest lines that lift the size back to hero scale.
  const words = text.trim().split(WHITESPACE);
  let lines = [text];
  for (let n = 2; n <= Math.min(MAX_LINES, words.length); n++) {
    lines = balanceLines(words, n);
    const widest = Math.max(...lines.map(units));
    if (contentW / widest >= WRAP_MIN_FONT) {
      break;
    }
  }
  const widest = Math.max(...lines.map(units));
  return {
    lines,
    fontSize: clamp(contentW / widest, MIN_FONT, MAX_FONT),
    fill: false,
  };
}
