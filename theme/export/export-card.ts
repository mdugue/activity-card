import { preCache, snapdom } from "@zumer/snapdom";
import type { ActivityData } from "@/lib/activity";
import {
  applyMetadata,
  type MetadataInput,
  type MetadataOptions,
  routeCentroid,
} from "@/lib/metadata";
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
  // - `embedFonts`: inline the theme's @font-face into the snapshot. Without it
  //   snapdom only embeds icon fonts, so headlines would fall back to a system
  //   font in the export even though the preview looks right.
  // - `scale` + `dpr: 1`: emit a deterministic `pixelRatio`× of the card's
  //   native size on every device. Left at its default, `dpr` tracks the
  //   viewer's screen density and a Retina display would double the output
  //   again. Pinning it keeps 1080×1350 → 2160×2700 everywhere.
  // WebKit/iOS Safari intermittently falls back from the @font-face to a system
  // font on the FIRST snapdom pass (snapdom #253); `preCache` warms the fonts +
  // images and a discarded warm-up render primes the pipeline so the real
  // capture below embeds the real typefaces reliably.
  await preCache(node, { embedFonts: true });
  const snapOpts = {
    width,
    height,
    scale: pixelRatio,
    dpr: 1,
    embedFonts: true,
  } as const;
  await snapdom.toCanvas(node, snapOpts);
  const blob = await snapdom.toBlob(node, { ...snapOpts, type: "png" });

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
