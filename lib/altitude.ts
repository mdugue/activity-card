/**
 * Altitude theme — configuration model and pure stat resolution.
 *
 * Kept JSX-free (and out of the component) so the claim/supporting-stat logic
 * is unit-testable under `bun:test`. The component in
 * `components/themes/altitude.tsx` consumes these; the editor controls in
 * `components/app/altitude-controls.tsx` drive the config.
 *
 * Values are formatted here via `lib/format.ts` so the theme renders strings
 * directly. English/metric formatting, consistent with every other theme.
 */

import type { ActivityData, Sport } from "@/components/app/sample-data";
import {
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";

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

/** Vertical anchor of the claim cluster. */
export type AltitudePosition = "top" | "center" | "bottom";

/** How the claim relates to the elevation line. */
export type AltitudeClaimStyle = "cutout" | "stacked";

export interface AltitudeConfig {
  /** The hero metric, or `null` to show no claim (line + supporting stats only). */
  claim: AltitudeClaim | null;
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

type StatBuilder = (data: ActivityData) => ResolvedStat | null;

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
function metricStat(key: StatKey, data: ActivityData): ResolvedStat | null {
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
  claim: AltitudeClaim | null,
  data: ActivityData
): ResolvedClaim | null {
  if (claim === null) {
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
  data: ActivityData,
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
export function claimOptions(data: ActivityData): AltitudeClaim[] {
  return CLAIM_PICKER_ORDER.filter((k) =>
    k === "name" ? Boolean(data.title?.trim()) : metricStat(k, data) !== null
  );
}
