import { snapdom } from "@zumer/snapdom";

import type { ActivityData } from "@/lib/activity";
import { applyMetadata, routeCentroid } from "@/lib/metadata";
import type { MetadataInput, MetadataOptions } from "@/lib/metadata";

import { deliverFiles, waitForFonts } from "./export-shared";

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
export async function exportCard(
  node: HTMLElement,
  opts: ExportOptions = {}
): Promise<void> {
  const {
    width = 1080,
    height = 1350,
    pixelRatio = 2,
    filename = "effort-card.png",
    metadata,
    metadataOptions,
  } = opts;

  await waitForFonts();

  // snapdom rasterises the live DOM straight to a PNG blob.
  // - `embedFonts`: inline the theme's @font-face into the snapshot. Its
  //   default (`'auto'`) already does this in v3; kept explicit because a
  //   headline silently falling back to a system font is the failure mode.
  // - `width`/`height`: since snapdom v3 an explicit output size *wins over*
  //   `scale` instead of being multiplied by it, so the pixel ratio is baked
  //   into the dimensions here (1080×1350 → 2160×2700).
  // - `dpr: 1`: left at its default, `dpr` tracks the viewer's screen density
  //   and a Retina display would double the output again. Pinning it keeps the
  //   export identical on every device.
  const blob = await snapdom.toBlob(node, {
    width: width * pixelRatio,
    height: height * pixelRatio,
    dpr: 1,
    embedFonts: true,
    format: "png",
  });

  // Inject Effort metadata into the raw PNG bytes (canvas output carries none).
  const raw = new Uint8Array(await blob.arrayBuffer());
  const bytes = metadata ? applyMetadata(raw, metadata, metadataOptions) : raw;
  // reason: BlobPart typing predates ArrayBufferView<ArrayBuffer> narrowing.
  const out = new Blob([bytes as BlobPart], { type: "image/png" });
  const file = new File([out], filename, { type: "image/png" });

  await deliverFiles([file], { title: "My Effort card" });
}

/** Map an activity to the metadata baked into its export (GPS gated by opts). */
export function activityMetadata(
  data: ActivityData,
  url?: string
): MetadataInput {
  return {
    athleteName: data.athleteName || undefined,
    date: data.date,
    location: data.location || undefined,
    point: routeCentroid(data.routeCoordinates),
    title: data.title || undefined,
    url,
  };
}
