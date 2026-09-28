/**
 * The ONE "profile signal" rule — which 1-D series a profile visualisation
 * (elevation band, altitude line, strata ridge, mini-viz) draws:
 *
 *   elevation, else pace, else swim laps — and only if there's enough to draw.
 *
 * "Enough to draw" (`isDrawableSeries`): a series is drawable when it has at
 * least `MIN_PROFILE_POINTS` (2) points — the strictest rule the call sites used
 * before this module existed (`length > 1`). A present-but-degenerate series
 * (empty, or a single point) is treated exactly like a missing one, so it can
 * never shadow a usable fallback: a 1-point elevation array does NOT hide a
 * usable pace profile (the bug a bare `elevationProfile ?? paceProfile` had).
 *
 * A multi-activity project (triathlon, brick) keeps its series on the
 * segments; there every leg must share ONE metric so the overlaid curves share
 * one vertical scale — elevation when any leg has a drawable elevation
 * profile, otherwise pace (`segmentProfileMetric`). Segments carry no laps.
 *
 * Theme-agnostic and pure (inputs are structural), so both theme families and
 * the other `lib/` geometry modules share it.
 */

/** Fewest points a series needs before it's worth drawing a curve. */
export const MIN_PROFILE_POINTS = 2;

/** Whether `series` has enough points to draw (see module doc). */
export function isDrawableSeries(
  series: readonly number[] | null | undefined
): series is number[] {
  return (series?.length ?? 0) >= MIN_PROFILE_POINTS;
}

/** The series a profile viz draws, in preference order. */
export type ProfileMode = "elevation" | "pace" | "laps";

export type ProfileLabel = "ELEVATION" | "PACE" | "LAPS";

export type ProfileSignal =
  | { label: ProfileLabel; mode: ProfileMode; series: number[] }
  | { label: null; mode: "none"; series: null };

/** The profile inputs of an activity — structural, so any activity view fits. */
export interface ProfileSource {
  elevationProfile?: number[];
  /** swim, sec/100m per lap */
  lapPacesPer100m?: number[];
  paceProfile?: number[];
}

export const NO_PROFILE_SIGNAL: ProfileSignal = {
  mode: "none",
  series: null,
  label: null,
};

const LABELS: Record<ProfileMode, ProfileLabel> = {
  elevation: "ELEVATION",
  pace: "PACE",
  laps: "LAPS",
};

/**
 * Pick a single activity's profile signal from its top-level series:
 * elevation, else pace, else laps — the first one that's drawable.
 */
export function profileSignal(data: ProfileSource): ProfileSignal {
  const candidates: [ProfileMode, number[] | undefined][] = [
    ["elevation", data.elevationProfile],
    ["pace", data.paceProfile],
    ["laps", data.lapPacesPer100m],
  ];
  for (const [mode, series] of candidates) {
    if (isDrawableSeries(series)) {
      return { mode, series, label: LABELS[mode] };
    }
  }
  return NO_PROFILE_SIGNAL;
}

/** The profile inputs of one project leg. */
export interface SegmentProfileSource {
  elevationProfile?: number[];
  paceProfile?: number[];
}

/** The metric shared by every leg of a multi-activity project. */
export type SegmentProfileMetric = "elevation" | "pace";

/**
 * The one metric every leg of a project is drawn in: elevation when any leg
 * has a drawable elevation profile, otherwise pace.
 */
export function segmentProfileMetric(
  segments: readonly SegmentProfileSource[]
): SegmentProfileMetric {
  return segments.some((s) => isDrawableSeries(s.elevationProfile))
    ? "elevation"
    : "pace";
}

/** A leg's series in `metric`, or `null` when it has nothing drawable. */
export function legSeries(
  segment: SegmentProfileSource,
  metric: SegmentProfileMetric
): number[] | null {
  const series =
    metric === "elevation" ? segment.elevationProfile : segment.paceProfile;
  return isDrawableSeries(series) ? series : null;
}
