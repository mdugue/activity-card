import { snapdom } from "@zumer/snapdom";
import type { ActivityData } from "./activity";
import { isDesktopDevice, waitForFonts } from "./export-shared";
import {
  applyMetadata,
  type MetadataInput,
  type MetadataOptions,
  routeCentroid,
} from "./metadata";

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
  const blob = await snapdom.toBlob(node, {
    width,
    height,
    scale: pixelRatio,
    dpr: 1,
    embedFonts: true,
    type: "png",
  });

  // Inject Effort metadata into the raw PNG bytes (canvas output carries none).
  const raw = new Uint8Array(await blob.arrayBuffer());
  const bytes = metadata ? applyMetadata(raw, metadata, metadataOptions) : raw;
  // reason: BlobPart typing predates ArrayBufferView<ArrayBuffer> narrowing.
  const out = new Blob([bytes as BlobPart], { type: "image/png" });
  const file = new File([out], filename, { type: "image/png" });

  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (!isDesktopDevice() && nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "My Effort card" });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        return;
      }
      // fall through to download
    }
  }

  triggerDownload(out, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
