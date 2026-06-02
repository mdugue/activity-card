import { toPng } from "html-to-image";
import { effortDateSlug, isIos, waitForFonts } from "./export-shared";

export interface ExportOptions {
  filename?: string;
  height?: number;
  pixelRatio?: number;
  width?: number;
}

/**
 * Rasterize a DOM node to PNG at the given intrinsic size, then either
 * share via the Web Share API (mobile) or trigger a download (desktop).
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
  } = opts;

  await waitForFonts();

  const renderOptions = {
    width,
    height,
    pixelRatio,
    cacheBust: true,
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

  const blob = await (await fetch(dataUrl)).blob();
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

  triggerDownload(dataUrl, filename);
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function defaultFilename(sport: string, date: string): string {
  return `effort_${sport}_${effortDateSlug(date)}.png`;
}
