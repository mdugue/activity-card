// Plumbing shared by both export pipelines (single card + carousel), so the
// device-specific quirks live in one place. The two modules still own their own
// delivery (single File vs a sliced File[] + canvases), but the font-gate and
// filename date-slug are identical and live here.
//
// snapdom primes the WebKit font/decode pipeline itself (`safariWarmupAttempts`,
// default 3), so neither pipeline needs the old "rasterise twice on iOS and
// discard the first pass" dance that html-to-image required.

/** Fonts must be ready before rasterisation or fallbacks leak into the export. */
export async function waitForFonts(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

/** Numeric date slug for export filenames (`date` is an ISO yyyy-mm-dd). */
export function effortDateSlug(date: string): string {
  return date.replace(/[^0-9-]/g, "") || "undated";
}

export function isDesktopDevice(): boolean {
  if (typeof window === "undefined" || !navigator) {
    return false;
  }

  // 1. Core platform check via userAgent
  const isDesktopPlatform = DESKTOP_PLATFORM_REGEX.test(navigator.userAgent);

  // 2. The iPad Trap: Modern iPads send "Macintosh" but support multi-touch
  const isIPad = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;

  return isDesktopPlatform && !isIPad;
}

const DESKTOP_PLATFORM_REGEX = /Macintosh|Windows|Linux/;

export function triggerDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Share the set on mobile (Web Share API), else download each in order. A
 *  positive `betweenMs` spaces downloads out (browsers throttle back-to-back). */
export async function deliverFiles(
  files: File[],
  opts: { title: string; betweenMs?: number }
): Promise<void> {
  if (files.length === 0) {
    return;
  }
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (!isDesktopDevice() && nav?.canShare?.({ files })) {
    try {
      await nav.share({ files, title: opts.title });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        return;
      }
      // fall through to downloads
    }
  }
  for (const file of files) {
    triggerDownload(file);
    if (opts.betweenMs) {
      await delay(opts.betweenMs);
    }
  }
}
