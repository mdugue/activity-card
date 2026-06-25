// Plumbing shared by both export pipelines (single card + carousel), so the
// device-specific quirks live in one place. The two modules still own their own
// delivery (single File + dataURL vs a sliced File[] + canvases), but the
// iOS-detection, font-gate and filename date-slug are identical and live here.

const IOS_UA_RE = /iPad|iPhone|iPod/;

/**
 * iOS Safari returns a blank/partial canvas on html-to-image's first pass (its
 * WebKit layer cache lags one paint), so both pipelines rasterise twice there
 * and discard the first result. Detect it here.
 */
export function isIos(): boolean {
  return (
    typeof navigator !== "undefined" && IOS_UA_RE.test(navigator.userAgent)
  );
}

/** Fonts must be ready before rasterisation or html-to-image swallows them. */
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
