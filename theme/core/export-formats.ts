/**
 * Export formats — the platform-optimised output sizes and their safe zones.
 * Effort's master is authored at 4:5 (1080×1350); every theme is *format-aware*,
 * rendering at the target size and reading these dimensions + safe insets from
 * the FormatContext. The background fills full-bleed; content stays inside the
 * **safe zone** via `mergeSafe`.
 *
 * `safe` models **occlusion, not crop**. The image is shown full-bleed, and
 * uncropped — the insets are the per-side keep-out where the platform paints
 * its own UI (caption, action rail, profile, reply box), so they're asymmetric,
 * never a uniform ring. The background bleeds *through* the keep-out; only
 * legible content stays inside it. (X's 2:1 link card is the lone genuine crop,
 * absorbed by its larger top/bottom inset.) See the `theme-architecture` skill.
 */

/** The canonical aspect buckets every platform maps onto. */
export type AspectBucket = "feed" | "square" | "story" | "landscape";

/** Keep-out insets in the format's own px space (top/right/bottom/left). */
export interface SafeInsets {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface ExportFormat {
  /** human aspect, e.g. "4:5" — shown as a hint, not used for math */
  aspectLabel: string;
  /** canonical aspect bucket — keeps the frame logic to four shapes */
  bucket: AspectBucket;
  height: number;
  /** stable id, e.g. "instagram-story" */
  id: string;
  /** display name, e.g. "Instagram Story" */
  label: string;
  /** short note shown in the picker / docs */
  note?: string;
  /** the platform family, e.g. "Instagram" (groups the picker) */
  platform: string;
  /** keep-out zone for text/stats; background may bleed through it */
  safe: SafeInsets;
  width: number;
}

const sym = (n: number): SafeInsets => ({
  top: n,
  right: n,
  bottom: n,
  left: n,
});

/**
 * The curated registry. Multiple platforms can share an aspect bucket but keep
 * their own id + safe insets (Strava ≠ generic story).
 */
export const EXPORT_FORMATS = {
  "instagram-feed": {
    id: "instagram-feed",
    label: "Instagram Feed",
    platform: "Instagram",
    bucket: "feed",
    aspectLabel: "4:5",
    width: 1080,
    height: 1350,
    // No chrome over the image (feed UI sits below it) and shown uncropped — so
    // this keep-out is purely the 4:5 master's own aesthetic margin.
    safe: sym(48),
    note: "Portrait feed — also Facebook & Threads",
  },
  "instagram-story": {
    id: "instagram-story",
    label: "Instagram Story",
    platform: "Instagram",
    bucket: "story",
    aspectLabel: "9:16",
    width: 1080,
    height: 1920,
    // Occlusion only (played full-bleed): top = progress bar + avatar + name +
    // close; bottom = reply bar. Tuned for STORIES — a static image can't be a
    // Reel, so the (video-only) Reels right action rail doesn't apply here.
    safe: { top: 220, right: 64, bottom: 220, left: 64 },
    note: "Static → posts to Stories (not Reels)",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    platform: "TikTok",
    bucket: "story",
    aspectLabel: "9:16",
    width: 1080,
    height: 1920,
    // Occlusion only (photo posts play full-bleed): bottom = @handle + caption
    // + music ticker (~440); right = action rail (avatar / like / comment /
    // share / sound disc, ~150); top = tab switcher + search.
    safe: { top: 130, right: 150, bottom: 440, left: 48 },
    note: "Heavy bottom caption + right action rail",
  },
  "whatsapp-status": {
    id: "whatsapp-status",
    label: "WhatsApp Status",
    platform: "WhatsApp",
    bucket: "story",
    aspectLabel: "9:16",
    width: 1080,
    height: 1920,
    // Occlusion only (fit-to-screen, letterboxed not cropped): top = progress
    // bar + avatar + sender name (~220); bottom = persistent "Reply…" pill +
    // home indicator (~280). No side rail.
    safe: { top: 220, right: 48, bottom: 280, left: 48 },
    note: "Progress bar top, reply box bottom",
  },
  strava: {
    id: "strava",
    label: "Strava",
    platform: "Strava",
    bucket: "story",
    aspectLabel: "9:16",
    width: 1080,
    height: 1920,
    // Shared full-bleed (no Strava chrome over a posted image) — a moderate,
    // fairly symmetric margin so the design survives Strava's centre-crop of the
    // same photo into its many card ratios. (Was top 300 — that over-reserved
    // for an in-app nav bar this static export never actually sits under.)
    safe: { top: 160, right: 64, bottom: 220, left: 64 },
    note: "Cover-crop tolerant — same photo, many crops",
  },
  "x-landscape": {
    id: "x-landscape",
    label: "X / Twitter",
    platform: "X",
    bucket: "landscape",
    aspectLabel: "16:9",
    width: 1600,
    height: 900,
    // Shown uncropped in-stream with no overlay, so the sides are aesthetic
    // only; the taller top/bottom survives the ~50px crop when this same asset
    // doubles as a 2:1 OpenGraph / link-card preview (also Komoot).
    safe: { top: 64, right: 40, bottom: 64, left: 40 },
    note: "In-stream, shown uncropped — also Komoot / OG",
  },
  square: {
    id: "square",
    label: "Square",
    platform: "Universal",
    bucket: "square",
    aspectLabel: "1:1",
    width: 1080,
    height: 1080,
    // Uncropped, no overlay — aesthetic margin only.
    safe: sym(56),
    note: "Strava-friendly, avatars, print",
  },
} as const satisfies Record<string, ExportFormat>;

export type ExportFormatId = keyof typeof EXPORT_FORMATS;

/** The 4:5 master — its output stays pixel-identical to the legacy export. */
export const DEFAULT_FORMAT_ID: ExportFormatId = "instagram-feed";

/** Picker / export-sheet order. */
export const FORMAT_ORDER: ExportFormatId[] = [
  "instagram-feed",
  "instagram-story",
  "square",
  "strava",
  "tiktok",
  "whatsapp-status",
  "x-landscape",
];

export function getFormat(id: ExportFormatId): ExportFormat {
  return EXPORT_FORMATS[id];
}

export function isExportFormatId(id: string): id is ExportFormatId {
  return id in EXPORT_FORMATS;
}

/** The legacy/master 4:5 canvas — rendered without the Hybrid frame. */
export function isDefaultFormat(id: string): boolean {
  return id === DEFAULT_FORMAT_ID;
}

/** The rectangle (format-space px) left for content after the safe insets. */
export function contentBox(format: ExportFormat): {
  h: number;
  w: number;
  x: number;
  y: number;
} {
  const { safe, width, height } = format;
  return {
    x: safe.left,
    y: safe.top,
    w: Math.max(0, width - safe.left - safe.right),
    h: Math.max(0, height - safe.top - safe.bottom),
  };
}

/**
 * The per-side keep-out a format-aware theme should actually apply: the larger
 * of the theme's own aesthetic margin (`natural`) and the platform safe inset.
 *
 * This is the heart of the format-aware contract. On the 4:5 master (feed) the
 * theme's own chrome is wider than the 48 px safe inset, so `natural` wins and
 * the master renders pixel-identical to the legacy design. On a tall Story /
 * cover-cropped Strava the platform inset is larger, so the content is pushed
 * clear of the caption box / action rail while the theme's background bleeds on.
 */
export function mergeSafe(
  safe: SafeInsets,
  natural: Partial<SafeInsets> = {}
): SafeInsets {
  return {
    top: Math.max(safe.top, natural.top ?? 0),
    right: Math.max(safe.right, natural.right ?? 0),
    bottom: Math.max(safe.bottom, natural.bottom ?? 0),
    left: Math.max(safe.left, natural.left ?? 0),
  };
}
