/**
 * Centralised formatters. `ActivityData` stores raw numbers; themes call
 * these at render time so a single unit toggle can re-format everything
 * without re-parsing.
 */

const DASH = "—";

export function formatDuration(sec: number | undefined): string {
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
}

/** Clock form: "1:23:45" or "5:18". Used for splits and transitions. */
export function formatClock(sec: number | undefined): string {
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
}

/** Run pace, stored as float minutes (4.95) → "4:57". */
export function formatPaceMin(minutes: number | undefined): string {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) {
    return DASH;
  }
  const totalSec = Math.round(minutes * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Swim pace, stored as seconds-per-100m (118) → "1:58". */
export function formatPaceSec(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return DASH;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatNumber(n: number | undefined, digits = 0): string {
  if (n === undefined || !Number.isFinite(n)) {
    return DASH;
  }
  return n.toFixed(digits);
}

export function formatDate(iso: string | undefined): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** ISO date → "MAY 18, 2026". */
export function formatDateUpper(iso: string | undefined): string {
  return formatDate(iso).toUpperCase();
}
