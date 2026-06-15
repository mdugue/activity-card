/**
 * Export formats — the platform-optimised output sizes and their safe zones.
 *
 * Effort's master design is authored at 4:5 (1080×1350). To target other
 * platforms we render the same design into a different canvas via the Hybrid
 * frame (`components/themes/shared/format-frame.tsx`): the background (photo /
 * route / colour wash) fills the target *full-bleed*, while the content block
 * (headline + stats + marks) keeps its internal layout and is placed inside the
 * format's **safe zone**.
 *
 * Safe insets are **asymmetric** (the danger sits top / bottom / at the edges,
 * not uniformly "around") and **conservative percentages** baked to px in each
 * format's own coordinate space — never pixel-tuned to one device. See
 * `docs`/the plan §2 + §2.1 (Strava) for the research behind the numbers.
 */

/** The canonical aspect buckets every platform maps onto. */
export type AspectBucket = "feed" | "square" | "story" | "landscape";

/** Where the (aspect-preserved) content block sits inside the safe box. */
export type ContentPlacement = "center" | "lower" | "upper";

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
  /** how the content block is anchored within the safe box */
  placement: ContentPlacement;
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
 * their own id + safe insets (Strava ≠ generic story — see §2.1).
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
    safe: sym(48),
    placement: "center",
    note: "Portrait feed — also Facebook & Threads",
  },
  square: {
    id: "square",
    label: "Square",
    platform: "Universal",
    bucket: "square",
    aspectLabel: "1:1",
    width: 1080,
    height: 1080,
    safe: sym(56),
    placement: "center",
    note: "Strava-friendly, avatars, print",
  },
  "instagram-story": {
    id: "instagram-story",
    label: "Instagram Story",
    platform: "Instagram",
    bucket: "story",
    aspectLabel: "9:16",
    width: 1080,
    height: 1920,
    // Top: profile/close. Bottom: caption + send. Reels action rail on the right.
    safe: { top: 250, right: 270, bottom: 420, left: 64 },
    placement: "lower",
    note: "Stories & Reels",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    platform: "TikTok",
    bucket: "story",
    aspectLabel: "9:16",
    safe: { top: 130, right: 270, bottom: 500, left: 64 },
    width: 1080,
    height: 1920,
    placement: "upper",
    note: "Heavy bottom caption + right action rail",
  },
  "whatsapp-status": {
    id: "whatsapp-status",
    label: "WhatsApp Status",
    platform: "WhatsApp",
    bucket: "story",
    aspectLabel: "9:16",
    safe: { top: 140, right: 48, bottom: 160, left: 48 },
    width: 1080,
    height: 1920,
    placement: "center",
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
    // Cover-crop tolerant: generous TOP (Dynamic Island + nav), reserved bottom
    // band (map thumbnail + "Save route" pill), side insets so cover-overflow
    // never decapitates text. Content vertically centred (survives the short
    // collapsed header *and* the tall expanded crop). See plan §2.1.
    safe: { top: 300, right: 88, bottom: 230, left: 88 },
    placement: "center",
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
    safe: sym(40),
    placement: "center",
    note: "In-stream, shown uncropped — also Komoot / OG",
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
 * Cover-fit the master block to a format: scaled to FILL the whole canvas
 * (cropping the overflow), centred. The Hybrid frame uses this for the
 * full-bleed "back" layer — scrims and route/elevation lines run off every
 * edge rather than being boxed into the safe zone.
 */
export function coverFit(
  format: ExportFormat,
  contentW = 1080,
  contentH = 1350
): { h: number; scale: number; w: number; x: number; y: number } {
  const scale = Math.max(format.width / contentW, format.height / contentH);
  const w = contentW * scale;
  const h = contentH * scale;
  return {
    scale,
    w,
    h,
    x: (format.width - w) / 2,
    y: (format.height - h) / 2,
  };
}

/**
 * Contain-fit the readable "front" layer inside a format's safe box, preserving
 * aspect and honouring the placement anchor. Fills as much of the safe box as
 * the aspect allows — "fill the safe zone", not "a tiny thing in the middle".
 */
export function placeContent(
  format: ExportFormat,
  contentW = 1080,
  contentH = 1350
): { h: number; scale: number; w: number; x: number; y: number } {
  const box = contentBox(format);
  const scale = Math.min(box.w / contentW, box.h / contentH);
  const w = contentW * scale;
  const h = contentH * scale;
  const x = box.x + (box.w - w) / 2;
  let y: number;
  if (format.placement === "upper") {
    y = box.y;
  } else if (format.placement === "lower") {
    y = box.y + (box.h - h);
  } else {
    y = box.y + (box.h - h) / 2;
  }
  return { scale, x, y, w, h };
}
