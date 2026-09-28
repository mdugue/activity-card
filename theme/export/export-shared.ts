// Plumbing shared by both export pipelines (single card + carousel), so the
// device-specific quirks live in one place. The two modules still own their own
// delivery (single File vs a sliced File[] + canvases), but the font-gate and
// filename date-slug are identical and live here.
//
// WebKit's quirks are NOT handled for us: snapdom v3 has no Safari warm-up
// option, and re-rasterising wouldn't help with the real problem anyway —
// WebKit drops a photo-sized bitmap from the SVG it rasterises through, so the
// background silently vanishes from the export. `rasterize.ts` probes for that
// and composites the photo onto the canvas itself.

/** Fonts must be ready before rasterisation or fallbacks leak into the export. */
export const waitForFonts = async (): Promise<void> => {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
};

/** Numeric date slug for export filenames (`date` is an ISO yyyy-mm-dd). */
export const effortDateSlug = (date: string): string =>
  date.replaceAll(/[^0-9-]/gu, "") || "undated";

const DESKTOP_PLATFORM_REGEX = /Macintosh|Windows|Linux/u;

export const isDesktopDevice = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  // 1. Core platform check via userAgent
  const isDesktopPlatform = DESKTOP_PLATFORM_REGEX.test(navigator.userAgent);

  // 2. The iPad Trap: Modern iPads send "Macintosh" but support multi-touch
  const isIPad = navigator.maxTouchPoints > 1;

  return isDesktopPlatform && !isIPad;
};

/** How long a download's object URL outlives its click. `a.click()` only
 *  queues the navigation — revoking in the same task can cancel the download
 *  (seen in Firefox and Safari), so the URL is released a beat later. */
export const REVOKE_DELAY_MS = 1000;

export const triggerDownload = (file: File): void => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
};

/** A single-flight gate for export clicks. It is plain mutable state, not
 *  React state, so a second click in the same frame (before a re-render has
 *  disabled the buttons) sees the first one and is dropped. */
export interface InFlightGuard {
  readonly busy: boolean;
  /** Runs `task` unless one is already running; resolves `false` if dropped. */
  run: (task: () => Promise<void>) => Promise<boolean>;
}

export const createInFlightGuard = (): InFlightGuard => {
  let busy = false;
  return {
    get busy() {
      return busy;
    },
    async run(task) {
      if (busy) {
        return false;
      }
      busy = true;
      try {
        await task();
      } finally {
        busy = false;
      }
      return true;
    },
  };
};

/** Adapt a callback-only DOM API (`setTimeout`, `canvas.toBlob`, image load
 *  events) to a promise — the one place the export pipeline builds one. */
export const fromCallback = async <T>(
  start: (resolve: (value: T) => void, reject: (reason: Error) => void) => void
): Promise<T> =>
  // oxlint-disable-next-line promise/avoid-new -- the single adapter for callback-only DOM APIs; Promise.withResolvers needs Safari 17.4, above the supported browser baseline
  await new Promise<T>(start);

export const delay = async (ms: number): Promise<void> => {
  await fromCallback<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, ms);
  });
};

/** Share the set on mobile (Web Share API), else download each in order. A
 *  positive `betweenMs` spaces downloads out (browsers throttle back-to-back). */
export const deliverFiles = async (
  files: File[],
  opts: { title: string; betweenMs?: number }
): Promise<void> => {
  if (files.length === 0) {
    return;
  }
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (!isDesktopDevice() && nav?.canShare?.({ files }) === true) {
    try {
      await nav.share({ files, title: opts.title });
      return;
    } catch (error) {
      // The user dismissing the share sheet rejects with an AbortError
      // DOMException (an Error subclass).
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      // fall through to downloads
    }
  }
  const { betweenMs } = opts;
  for (const file of files) {
    triggerDownload(file);
    if (betweenMs !== undefined && betweenMs > 0) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- the spacing IS the point: browsers throttle back-to-back downloads, so each one must wait for the previous gap
      await delay(betweenMs);
    }
  }
};
