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
import type {
  ParamDef,
  ParamOption,
  ThemeConfig,
} from "@/theme/core/params/kinds";
import type { ActivityView } from "@/theme/core/theme-contract";

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
export interface AltitudeConfig extends ThemeConfig {
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
  avgSpeed: (data) =>
    isNum(data.avgSpeedKmh)
      ? {
          isText: false,
          label: "AVG SPEED",
          unit: "km/h",
          value: formatNumber(data.avgSpeedKmh, 1),
        }
      : null,
  cadence: (data) =>
    isNum(data.avgCadence)
      ? {
          isText: false,
          label: "CADENCE",
          unit: "spm",
          value: formatNumber(data.avgCadence),
        }
      : null,
  distance: (data) => {
    if (!isNum(data.distanceKm)) {
      return null;
    }
    return data.sport === "swim"
      ? {
          isText: false,
          label: "DISTANCE",
          unit: "m",
          value: formatNumber(data.distanceKm * 1000),
        }
      : {
          isText: false,
          label: "DISTANCE",
          unit: "km",
          value: data.distanceKm.toFixed(1),
        };
  },
  duration: (data) =>
    isNum(data.durationSec)
      ? {
          isText: false,
          label: "TIME",
          unit: "",
          value: formatDuration(data.durationSec),
        }
      : null,
  elevation: (data) =>
    isNum(data.elevationGainM)
      ? {
          isText: false,
          label: "ELEV GAIN",
          unit: "m",
          value: formatNumber(data.elevationGainM),
        }
      : null,
  heartRate: (data) =>
    isNum(data.avgHeartRate)
      ? {
          isText: false,
          label: "AVG HR",
          unit: "bpm",
          value: formatNumber(data.avgHeartRate),
        }
      : null,
  maxSpeed: (data) =>
    isNum(data.maxSpeedKmh)
      ? {
          isText: false,
          label: "MAX SPEED",
          unit: "km/h",
          value: formatNumber(data.maxSpeedKmh, 1),
        }
      : null,
  name: (data) => {
    const v = data.title?.trim();
    return v ? { isText: true, label: "ACTIVITY", unit: "", value: v } : null;
  },
  pace: (data) => {
    if (data.sport === "swim" && isNum(data.avgPacePer100m)) {
      return {
        isText: false,
        label: "PACE",
        unit: "/100m",
        value: formatPaceSec(data.avgPacePer100m),
      };
    }
    return isNum(data.avgPaceMinPerKm)
      ? {
          isText: false,
          label: "PACE",
          unit: "/km",
          value: formatPaceMin(data.avgPaceMinPerKm),
        }
      : null;
  },
  swolf: (data) =>
    isNum(data.swolf)
      ? {
          isText: false,
          label: "SWOLF",
          unit: "",
          value: formatNumber(data.swolf),
        }
      : null,
  vam: (data) =>
    isNum(data.vamMph)
      ? {
          isText: false,
          label: "VAM",
          unit: "m/h",
          value: formatNumber(data.vamMph),
        }
      : null,
};

/** Build a stat for one metric key, or `null` when the data isn't present. */
const metricStat = (key: StatKey, data: ActivityView): ResolvedStat | null =>
  STAT_BUILDERS[key](data);

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
  avgSpeed: "Avg speed",
  distance: "Distance",
  duration: "Time",
  elevation: "Elevation",
  maxSpeed: "Max speed",
  name: "Name",
  pace: "Pace",
};

/**
 * Resolve the claim to a renderable stat, falling back to the first sensible
 * available metric when the requested one is missing (stripped by a visibility
 * toggle, or absent for the sport). Returns `null` only when `claim` is `null`.
 */
export const resolveClaim = (
  claim: AltitudeHeadline,
  data: ActivityView
): ResolvedClaim | null => {
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
};

/**
 * Up to `max` supporting stats for the second line, in sport priority order,
 * skipping `excludeKey` (whatever the claim already shows) and any field the
 * activity doesn't have.
 */
export const supportingStats = (
  data: ActivityView,
  excludeKey: StatKey | null,
  max = 2
): ResolvedStat[] => {
  const out: ResolvedStat[] = [];
  for (const key of SUPPORTING_PRIORITY[data.sport]) {
    if (out.length >= max) {
      break;
    }
    const stat = key === excludeKey ? null : metricStat(key, data);
    if (stat) {
      out.push(stat);
    }
  }
  return out;
};

/** Headline options that resolve to real data for this activity. */
export const claimOptions = (data: ActivityView): AltitudeClaim[] =>
  CLAIM_PICKER_ORDER.filter((k) =>
    k === "name" ? Boolean(data.title?.trim()) : metricStat(k, data) !== null
  );

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
    default: DEFAULT_ALTITUDE_CONFIG.claim,
    group: "layout",
    id: "claim",
    kind: "select",
    label: "HEADLINE",
    optionIds: ALL_HEADLINES,
    options: (ctx): ParamOption[] => {
      const opts: ParamOption[] = claimOptions(ctx.data).map((c) => {
        const stat = resolveClaim(c, ctx.data);
        return {
          glyph: c,
          hint: stat?.label ?? CLAIM_LABELS[c],
          id: c,
          label: CLAIM_LABELS[c],
          // An empty unit (name / time) means "no unit chip".
          unit: stat === null || stat.unit === "" ? undefined : stat.unit,
          value: stat?.value ?? CLAIM_LABELS[c],
        };
      });
      opts.push({
        glyph: "none",
        hint: "No headline",
        id: "none",
        label: "None",
        value: "None",
      });
      return opts;
    },
  },
  {
    default: DEFAULT_ALTITUDE_CONFIG.font,
    group: "layout",
    id: "font",
    kind: "segmented",
    label: "FONT",
    options: [
      { blurb: "bold condensed", id: "modern", label: "MODERN" },
      { blurb: "elegant", id: "serif", label: "SERIF" },
    ],
  },
  {
    default: DEFAULT_ALTITUDE_CONFIG.position,
    group: "layout",
    id: "position",
    kind: "segmented",
    label: "POSITION",
    options: [
      { id: "top", label: "TOP" },
      { id: "center", label: "CENTER" },
      { id: "bottom", label: "BOTTOM" },
    ],
  },
  {
    default: DEFAULT_ALTITUDE_CONFIG.claimStyle,
    group: "layout",
    id: "claimStyle",
    kind: "segmented",
    label: "TREATMENT",
    options: [
      { blurb: "line through type", id: "cutout", label: "CUTOUT" },
      { blurb: "line below", id: "stacked", label: "STACKED" },
    ],
    visibleWhen: (cfg) => cfg.claim !== "none",
  },
  {
    default: DEFAULT_ALTITUDE_CONFIG.cutoutOpacity,
    group: "layout",
    id: "cutoutOpacity",
    kind: "slider",
    label: "CUTOUT OPACITY",
    max: 100,
    min: 0,
    step: 1,
    unit: "%",
    visibleWhen: (cfg) => cfg.claim !== "none" && cfg.claimStyle === "cutout",
  },
  {
    default: DEFAULT_ALTITUDE_CONFIG.secondLine,
    group: "layout",
    id: "secondLine",
    kind: "toggle",
    label: "Second line of stats",
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
  // Anton — heavy + condensed
  modern: 0.5,
  // Playfair Display
  serif: 0.55,
};

/** Largest hero height (px) we allow, so a 1–2 char value can't fill the card. */
const MAX_FONT = 560;
const MIN_FONT = 40;
/** Below this single-line size a name is wrapped instead of shrunk further. */
const WRAP_MIN_FONT = 150;
/** A single line is justified to the full width once it's at least this full. */
const FILL_RATIO = 0.86;
const MAX_LINES = 3;
const WHITESPACE = /\s+/u;

export interface ClaimLayout {
  /** Stretch the (single) line to exactly the content width. */
  fill: boolean;
  fontSize: number;
  lines: string[];
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

/** Greedy, length-balanced split of `words` into `n` lines. */
const balanceLines = (words: string[], n: number): string[] => {
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
};

/**
 * Size (and, for long names, wrap) the hero text so it reads as large as
 * possible across the given content width. Numbers never wrap; names wrap on
 * whitespace once a single line would be too small to be a hero.
 */
export const layoutClaim = (
  text: string,
  font: AltitudeFont,
  isText: boolean,
  contentW: number
): ClaimLayout => {
  const adv = ADVANCE[font];
  const units = (s: string) => Math.max(1, s.trim().length) * adv;
  const oneLineFont = contentW / units(text);

  // Numbers, short text, or anything with no spaces: a single line.
  if (!isText || oneLineFont >= WRAP_MIN_FONT || !text.trim().includes(" ")) {
    const fontSize = clamp(oneLineFont, MIN_FONT, MAX_FONT);
    const natural = units(text) * fontSize;
    return { fill: natural >= contentW * FILL_RATIO, fontSize, lines: [text] };
  }

  // Long name: find the fewest lines that lift the size back to hero scale.
  const words = text.trim().split(WHITESPACE);
  let lines = [text];
  for (let n = 2; n <= Math.min(MAX_LINES, words.length); n += 1) {
    lines = balanceLines(words, n);
    const widest = Math.max(...lines.map(units));
    if (contentW / widest >= WRAP_MIN_FONT) {
      break;
    }
  }
  const widest = Math.max(...lines.map(units));
  return {
    fill: false,
    fontSize: clamp(contentW / widest, MIN_FONT, MAX_FONT),
    lines,
  };
};
