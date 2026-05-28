import { toPng } from "html-to-image";

export interface ExportOptions {
  filename?: string;
  height?: number;
  pixelRatio?: number;
  width?: number;
}

const IOS_USER_AGENT_RE = /iPad|iPhone|iPod/;

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

  // Fonts must be ready before rasterisation or html-to-image swallows them.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

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

function isIos(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return IOS_USER_AGENT_RE.test(navigator.userAgent);
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
  // `date` is an ISO yyyy-mm-dd string; render it into the filename as-is.
  const slug = date.replace(/[^0-9-]/g, "") || "undated";
  return `effort_${sport}_${slug}.png`;
}
