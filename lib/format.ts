/**
 * Centralised formatters. `ActivityData` stores raw numbers; themes call
 * these at render time so a single unit toggle can re-format everything
 * without re-parsing.
 */

const DASH = "—";

/** True for a present, finite number — the guard themes gate optional stats on. */
export const isNum = (n: number | undefined): n is number =>
  n !== undefined && Number.isFinite(n);

/** Sport → upper-case article label ("A CYCLE" / "A RUN" / …). */
export const sportArticleLabel = (sport: string): string => {
  if (sport === "ride") {
    return "A CYCLE";
  }
  if (sport === "run") {
    return "A RUN";
  }
  if (sport === "swim") {
    return "A SWIM";
  }
  if (sport === "triathlon") {
    return "A TRIATHLON";
  }
  return "AN EFFORT";
};

export const formatDuration = (sec?: number): string => {
  if (sec === undefined || !Number.isFinite(sec) || sec <= 0) {
    return DASH;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
};

/** Clock form: "1:23:45" or "5:18". Used for splits and transitions. */
export const formatClock = (sec?: number): string => {
  if (sec === undefined || !Number.isFinite(sec) || sec <= 0) {
    return DASH;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
};

/** Run pace, stored as float minutes (4.95) → "4:57". */
export const formatPaceMin = (minutes?: number): string => {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) {
    return DASH;
  }
  const totalSec = Math.round(minutes * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/** Swim pace, stored as seconds-per-100m (118) → "1:58". */
export const formatPaceSec = (seconds?: number): string => {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return DASH;
  }
  // Round the total first so 119.6 carries to "2:00", never "1:60".
  const totalSec = Math.round(seconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const formatNumber = (n?: number, digits = 0): string => {
  if (n === undefined || !Number.isFinite(n)) {
    return DASH;
  }
  return n.toFixed(digits);
};

/** A bare `YYYY-MM-DD` calendar date (no time, no zone). */
export const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

export interface FormatDateOptions {
  /** "long" → "September 3, 2026" (default); "short" → "Sep 3, 2026". */
  month?: "long" | "short";
}

/**
 * ISO date → "May 18, 2026". A bare `YYYY-MM-DD` is a calendar date, not an
 * instant: `new Date()` reads it as UTC midnight, so it is formatted in UTC to
 * print the same day in every viewer timezone. Full timestamps keep the
 * viewer's local day.
 */
export const formatDate = (
  iso?: string,
  { month = "long" }: FormatDateOptions = {}
): string => {
  if (iso === undefined || iso === "") {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month,
    year: "numeric",
    ...(CALENDAR_DATE_RE.test(iso) && { timeZone: "UTC" }),
  });
};

/** ISO date → "MAY 18, 2026". */
export const formatDateUpper = (iso?: string): string =>
  formatDate(iso).toUpperCase();
