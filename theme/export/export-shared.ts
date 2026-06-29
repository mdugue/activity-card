// Plumbing shared by both export pipelines (single card + carousel), so the
// device-specific quirks live in one place. The two modules still own their own
// delivery (single File vs a sliced File[] + canvases), but the font-gate and
// filename date-slug are identical and live here.
//
// iOS Safari needs both halves of the font gate: `waitForFonts` force-decodes
// every registered face (snapdom's own `safariWarmupAttempts` only force-loads
// icon fonts, not the theme's web fonts), and the export modules still discard a
// warm-up snapdom pass — empirically that warm-up is what makes the freshly
// loaded background photo paint into the capture (snapdom #129).

/**
 * Fonts must be fully decoded before rasterisation or fallbacks leak into the
 * export. `document.fonts.ready` alone is not enough: `next/font` registers each
 * weight as a separate `@font-face` and only fetches it the first time a glyph
 * needs it, so a freshly-mounted export deck may still have its display weight
 * (e.g. Cormorant 600) in flight when `ready` resolves. On iOS Safari the SVG
 * rasteriser then paints the first glyphs before that face has decoded and they
 * fall back to a system serif (snapdom #253) — which is why a headline's first
 * letter can differ from the rest, intermittently. Force-loading every
 * registered face up front removes that race deterministically.
 */
export async function waitForFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }
  try {
    await Promise.all(
      Array.from(document.fonts).map((face) =>
        face.status === "loaded"
          ? Promise.resolve(face)
          : face.load().catch(() => face)
      )
    );
  } catch {
    // best-effort — fall through to the ready gate below
  }
  await document.fonts.ready;
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
