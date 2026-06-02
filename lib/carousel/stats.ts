/**
 * Sport-aware stat model for carousel slides. Reuses the single-card stat
 * conventions (see the `sport-data` skill): rides think in speed, runs in
 * pace, swims in pace-per-100m and SWOLF. Returns ordered, formatted items so
 * every template (Hero, StatRow, StatGrid, Editorial) and the override panel
 * draw from one source of truth.
 */

import type { ActivityData } from "@/components/app/sample-data";
import {
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";

export interface StatItem {
  /** stable identifier, used for visibility toggles */
  key: string;
  label: string;
  /** unit suffix (e.g. "km", "/km", "bpm"); empty for unitless */
  unit: string;
  /** formatted magnitude, no unit (e.g. "87.3") */
  value: string;
}

function distance(data: ActivityData): StatItem {
  if (data.sport === "swim") {
    return {
      key: "distance",
      label: "DISTANCE",
      value: (data.distanceKm * 1000).toFixed(0),
      unit: "m",
    };
  }
  return {
    key: "distance",
    label: "DISTANCE",
    value: data.distanceKm.toFixed(1),
    unit: "km",
  };
}

function duration(data: ActivityData): StatItem {
  return {
    key: "duration",
    label: "TIME",
    value: formatDuration(data.durationSec),
    unit: "",
  };
}

/** Build the full ordered set of stats available for this activity. Items
 *  with no underlying data are omitted so templates never render a dash. */
export function buildStats(data: ActivityData): StatItem[] {
  const items: StatItem[] = [distance(data)];
  const push = (item: StatItem | null) => {
    if (item) {
      items.push(item);
    }
  };
  const num = (
    key: string,
    label: string,
    n: number | undefined,
    unit: string,
    digits = 0
  ): StatItem | null =>
    n === undefined || !Number.isFinite(n)
      ? null
      : { key, label, value: formatNumber(n, digits), unit };

  if (data.sport === "ride") {
    push(num("elevation", "ELEVATION", data.elevationGainM, "m"));
    push(num("avgSpeed", "AVG SPEED", data.avgSpeedKmh, "km/h", 1));
    push(duration(data));
    push(num("maxSpeed", "MAX SPEED", data.maxSpeedKmh, "km/h", 1));
    push(num("power", "NORM POWER", data.normalizedPowerW, "w"));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
    push(num("cadence", "CADENCE", data.avgCadence, "rpm"));
    push(num("vam", "VAM", data.vamMph, "m/h"));
  } else if (data.sport === "run") {
    push(
      data.avgPaceMinPerKm
        ? {
            key: "pace",
            label: "AVG PACE",
            value: formatPaceMin(data.avgPaceMinPerKm),
            unit: "/km",
          }
        : null
    );
    push(duration(data));
    push(num("elevation", "ELEVATION", data.elevationGainM, "m"));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
    push(num("cadence", "CADENCE", data.avgCadence, "spm"));
  } else if (data.sport === "swim") {
    push(
      data.avgPacePer100m
        ? {
            key: "pace",
            label: "PACE",
            value: formatPaceSec(data.avgPacePer100m),
            unit: "/100m",
          }
        : null
    );
    push(duration(data));
    push(num("swolf", "SWOLF", data.swolf, ""));
    push(num("stroke", "STROKES", data.strokeCountAvg, "/lap"));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
  } else {
    // triathlon — overall summary; per-segment lives in the template
    push(duration(data));
    push(num("elevation", "ELEVATION", data.elevationGainM, "m"));
    push(num("avgHr", "AVG HR", data.avgHeartRate, "bpm"));
  }

  return items;
}

/** The single most expressive stat for a Hero slide — distance for most
 *  sports, with elevation as the headline only when it dwarfs a short ride. */
export function heroStat(data: ActivityData): StatItem {
  const stats = buildStats(data);
  return stats[0];
}
