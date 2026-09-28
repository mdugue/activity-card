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
  bottom: n,
  left: n,
  right: n,
  top: n,
});

/** The 4:5 master's id (see `DEFAULT_FORMAT_ID`). */
const INSTAGRAM_FEED = "instagram-feed";

/**
 * The curated registry. Multiple platforms can share an aspect bucket but keep
 * their own id + safe insets (Strava ≠ generic story).
 */
export const EXPORT_FORMATS = {
  "instagram-feed": {
    aspectLabel: "4:5",
    bucket: "feed",
    height: 1350,
    id: INSTAGRAM_FEED,
    label: "Instagram Feed",
    note: "Portrait feed — also Facebook & Threads",
    platform: "Instagram",
    // No chrome over the image (feed UI sits below it) and shown uncropped — so
    // this keep-out is purely the 4:5 master's own aesthetic margin.
    safe: sym(48),
    width: 1080,
  },
  "instagram-story": {
    aspectLabel: "9:16",
    bucket: "story",
    height: 1920,
    id: "instagram-story",
    label: "Instagram Story",
    note: "Static → posts to Stories (not Reels)",
    platform: "Instagram",
    // Occlusion only (played full-bleed): top = progress bar + avatar + name +
    // close; bottom = reply bar. Tuned for STORIES — a static image can't be a
    // Reel, so the (video-only) Reels right action rail doesn't apply here.
    safe: { bottom: 220, left: 64, right: 64, top: 220 },
    width: 1080,
  },
  square: {
    aspectLabel: "1:1",
    bucket: "square",
    height: 1080,
    id: "square",
    label: "Square",
    note: "Strava-friendly, avatars, print",
    platform: "Universal",
    // Uncropped, no overlay — aesthetic margin only.
    safe: sym(56),
    width: 1080,
  },
  strava: {
    aspectLabel: "9:16",
    bucket: "story",
    height: 1920,
    id: "strava",
    label: "Strava",
    note: "Cover-crop tolerant — same photo, many crops",
    platform: "Strava",
    // Shared full-bleed (no Strava chrome over a posted image) — a moderate,
    // fairly symmetric margin so the design survives Strava's centre-crop of the
    // same photo into its many card ratios. (Was top 300 — that over-reserved
    // for an in-app nav bar this static export never actually sits under.)
    safe: { bottom: 220, left: 64, right: 64, top: 160 },
    width: 1080,
  },
  tiktok: {
    aspectLabel: "9:16",
    bucket: "story",
    height: 1920,
    id: "tiktok",
    label: "TikTok",
    note: "Heavy bottom caption + right action rail",
    platform: "TikTok",
    // Occlusion only (photo posts play full-bleed): bottom = @handle + caption
    // + music ticker (~440); right = action rail (avatar / like / comment /
    // share / sound disc, ~150); top = tab switcher + search.
    safe: { bottom: 440, left: 48, right: 150, top: 130 },
    width: 1080,
  },
  "whatsapp-status": {
    aspectLabel: "9:16",
    bucket: "story",
    height: 1920,
    id: "whatsapp-status",
    label: "WhatsApp Status",
    note: "Progress bar top, reply box bottom",
    platform: "WhatsApp",
    // Occlusion only (fit-to-screen, letterboxed not cropped): top = progress
    // bar + avatar + sender name (~220); bottom = persistent "Reply…" pill +
    // home indicator (~280). No side rail.
    safe: { bottom: 280, left: 48, right: 48, top: 220 },
    width: 1080,
  },
  "x-landscape": {
    aspectLabel: "16:9",
    bucket: "landscape",
    height: 900,
    id: "x-landscape",
    label: "X / Twitter",
    note: "In-stream, shown uncropped — also Komoot / OG",
    platform: "X",
    // Shown uncropped in-stream with no overlay, so the sides are aesthetic
    // only; the taller top/bottom survives the ~50px crop when this same asset
    // doubles as a 2:1 OpenGraph / link-card preview (also Komoot).
    safe: { bottom: 64, left: 40, right: 40, top: 64 },
    width: 1600,
  },
} as const satisfies Record<string, ExportFormat>;

export type ExportFormatId = keyof typeof EXPORT_FORMATS;

/** The 4:5 master — its output stays pixel-identical to the legacy export. */
export const DEFAULT_FORMAT_ID: ExportFormatId = INSTAGRAM_FEED;

/** Picker / export-sheet order. */
export const FORMAT_ORDER: ExportFormatId[] = [
  INSTAGRAM_FEED,
  "instagram-story",
  "square",
  "strava",
  "tiktok",
  "whatsapp-status",
  "x-landscape",
];

export const getFormat = (id: ExportFormatId): ExportFormat =>
  EXPORT_FORMATS[id];

export const isExportFormatId = (id: string): id is ExportFormatId =>
  id in EXPORT_FORMATS;

/** The legacy/master 4:5 canvas — rendered without the Hybrid frame. */
export const isDefaultFormat = (id: string): boolean =>
  id === DEFAULT_FORMAT_ID;

/** A rectangle in format-space px. */
export interface ContentBox {
  h: number;
  w: number;
  x: number;
  y: number;
}

/** The rectangle (format-space px) left for content after the safe insets. */
export const contentBox = (format: ExportFormat): ContentBox => {
  const { safe, width, height } = format;
  return {
    h: Math.max(0, height - safe.top - safe.bottom),
    w: Math.max(0, width - safe.left - safe.right),
    x: safe.left,
    y: safe.top,
  };
};

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
export const mergeSafe = (
  safe: SafeInsets,
  natural: Partial<SafeInsets> = {}
): SafeInsets => ({
  bottom: Math.max(safe.bottom, natural.bottom ?? 0),
  left: Math.max(safe.left, natural.left ?? 0),
  right: Math.max(safe.right, natural.right ?? 0),
  top: Math.max(safe.top, natural.top ?? 0),
});
