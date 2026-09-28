import type { ActivityData } from "@/lib/activity";
import { applyMetadata, routeCentroid } from "@/lib/metadata";
import type { MetadataInput, MetadataOptions } from "@/lib/metadata";

import { deliverFiles, waitForFonts } from "./export-shared";
import { canvasToPng, rasterizeNode } from "./rasterize";

export interface ExportOptions {
  filename?: string;
  height?: number;
  /** Effort attribution (+ optional GPS) baked into the PNG when provided. */
  metadata?: MetadataInput;
  metadataOptions?: MetadataOptions;
  pixelRatio?: number;
  width?: number;
}

/**
 * Rasterize a DOM node to PNG at the given intrinsic size, inject metadata,
 * then either share via the Web Share API (mobile) or trigger a download
 * (desktop).
 */
export const exportCard = async (
  node: HTMLElement,
  opts: ExportOptions = {}
): Promise<void> => {
  const {
    width = 1080,
    height = 1350,
    pixelRatio = 2,
    filename = "effort-card.png",
    metadata,
    metadataOptions,
  } = opts;

  await waitForFonts();

  // The pixel ratio is baked into the requested size (1080×1350 → 2160×2700);
  // `rasterizeNode` owns the snapdom options and the WebKit photo fallback.
  const canvas = await rasterizeNode(node, {
    height: height * pixelRatio,
    width: width * pixelRatio,
  });
  const blob = await canvasToPng(canvas);

  // Inject Effort metadata into the raw PNG bytes (canvas output carries none).
  const raw = new Uint8Array(await blob.arrayBuffer());
  const bytes = metadata ? applyMetadata(raw, metadata, metadataOptions) : raw;
  // BlobPart wants an ArrayBuffer-backed view; `applyMetadata` is typed over
  // ArrayBufferLike, so hand the Blob a byte-identical ArrayBuffer-backed copy.
  const out = new Blob([new Uint8Array(bytes)], { type: "image/png" });
  const file = new File([out], filename, { type: "image/png" });

  await deliverFiles([file], { title: "My Effort card" });
};

/** Map an activity to the metadata baked into its export (GPS gated by opts). */
export const activityMetadata = (
  data: ActivityData,
  url?: string
): MetadataInput => ({
  athleteName: data.athleteName || undefined,
  date: data.date,
  location: data.location || undefined,
  point: routeCentroid(data.routeCoordinates),
  title: data.title || undefined,
  url,
});
