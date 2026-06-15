import { toPng } from "html-to-image";
import type { ActivityData } from "./activity";
import { effortDateSlug, isIos, waitForFonts } from "./export-shared";
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

  // No `cacheBust`: html-to-image appends `?cache-bust=<time>` to every fetched
  // resource URL, which turns the photo's `blob:` object URL into an
  // unresolvable one — the fetch fails and the background silently drops from
  // the PNG. We have no cross-origin images that would need busting.
  const renderOptions = {
    width,
    height,
    pixelRatio,
    style: {
      transform: "none",
      transformOrigin: "top left",
    },
  };

  // iOS Safari: html-to-image's first pass returns a blank/partial canvas
  // because the WebKit layer cache lags one paint behind. Re-rasterise and
  // discard the first result. Cheap to do everywhere; required on iOS.
  if (isIos()) {
    await toPng(node, renderOptions);
  }

  const dataUrl = await toPng(node, renderOptions);

  // Inject Effort metadata into the raw PNG bytes (canvas output carries none).
  const raw = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
  const bytes = metadata ? applyMetadata(raw, metadata, metadataOptions) : raw;
  // reason: BlobPart typing predates ArrayBufferView<ArrayBuffer> narrowing.
  const blob = new Blob([bytes as BlobPart], { type: "image/png" });
  const file = new File([blob], filename, { type: "image/png" });

  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav?.canShare?.({ files: [file] })) {
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

  triggerDownload(blob, filename);
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

export function defaultFilename(sport: string, date: string): string {
  return `effort_${sport}_${effortDateSlug(date)}.png`;
}
