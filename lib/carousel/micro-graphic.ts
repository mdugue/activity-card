/**
 * "Technical micro-graphic" metadata (section 6) — small mono-typeset details
 * pulled from the activity: sport, date, origin coordinates, track point
 * count. Off by default; themes/slides opt in. Decorative, so it degrades
 * gracefully when a field (e.g. real geo coordinates) isn't available.
 */

import type { ActivityData, Coord } from "@/components/app/sample-data";

export interface MicroLine {
  label: string;
  value: string;
}

const SPORT_LABEL: Record<ActivityData["sport"], string> = {
  ride: "CYCLING",
  run: "RUNNING",
  swim: "SWIMMING",
  triathlon: "TRIATHLON",
};

/**
 * Route coordinates are stored as [lng, -lat]. Sample fixtures use normalised
 * shapes in roughly [-1.6, 1.6]; real tracks carry degrees well outside that.
 * Treat anything beyond ±2 as genuine geography worth printing.
 */
function looksGeographic(coords: Coord[] | undefined): boolean {
  if (!coords || coords.length === 0) {
    return false;
  }
  return coords.some(([x, y]) => Math.abs(x) > 2 || Math.abs(y) > 2);
}

function formatLatLng(coord: Coord): string {
  const [lng, negLat] = coord;
  const lat = -negLat;
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns} ${Math.abs(lng).toFixed(4)}°${ew}`;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/** ISO date → "2026.05.18". */
function techDate(iso: string): string {
  return ISO_DATE_RE.test(iso) ? iso.slice(0, 10).replace(/-/g, ".") : iso;
}

export function buildMicroGraphic(data: ActivityData): MicroLine[] {
  const lines: MicroLine[] = [
    { label: "ACT", value: SPORT_LABEL[data.sport] },
    { label: "DATE", value: techDate(data.date) },
  ];

  const coords = data.routeCoordinates;
  if (looksGeographic(coords) && coords) {
    lines.push({ label: "ORIGIN", value: formatLatLng(coords[0]) });
  }
  if (coords && coords.length > 1) {
    lines.push({ label: "TRACE", value: `${coords.length} PTS` });
  }
  return lines;
}
