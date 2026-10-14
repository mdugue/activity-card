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

import { createZip } from "@/lib/zip";
import type { ZipEntry } from "@/lib/zip";

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
 *  queues the navigation, and iOS Safari first asks "Download …?" — the URL
 *  has to survive until the person answers, or the confirmed download fetches
 *  a revoked URL and saves nothing. */
export const REVOKE_DELAY_MS = 120_000;

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

/** Runs async tasks strictly one after another, in call order — for work that
 *  shares one resource (the carousel overview's off-screen capture stage). A
 *  task's failure rejects only its own call; the next task still runs. */
export type SerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

export const createSerialQueue = (): SerialQueue => {
  let tail: Promise<unknown> = Promise.resolve();
  return async <T>(task: () => Promise<T>): Promise<T> => {
    const previous = tail;
    const current = (async () => {
      try {
        await previous;
      } catch {
        // An earlier task's failure belongs to its own caller.
      }
      return await task();
    })();
    tail = current;
    return await current;
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

/** What sharing a set came to. `blocked` means the browser wants a fresh tap
 *  first: a share must start from a user gesture, and a capture that takes a
 *  few seconds outlives the gesture that started it (iOS Safari). */
export type ShareOutcome = "shared" | "cancelled" | "blocked" | "unsupported";

/** Hand `files` to the OS share sheet (iOS: "Save N Images" to Photos). */
export const shareFiles = async (
  files: File[],
  title: string
): Promise<ShareOutcome> => {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav?.canShare?.({ files }) !== true) {
    return "unsupported";
  }
  try {
    await nav.share({ files, title });
    return "shared";
  } catch (error) {
    // Dismissing the sheet rejects with an AbortError, a share without a live
    // gesture with a NotAllowedError (both DOMExceptions, Error subclasses).
    if (error instanceof Error && error.name === "AbortError") {
      return "cancelled";
    }
    if (error instanceof Error && error.name === "NotAllowedError") {
      return "blocked";
    }
    return "unsupported";
  }
};

/** Download each file in order, spaced out — browsers throttle back-to-back
 *  programmatic downloads. */
export const downloadFiles = async (files: File[]): Promise<void> => {
  for (const [index, file] of files.entries()) {
    if (index > 0) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- the spacing IS the point: browsers throttle back-to-back downloads, so each one must wait for the previous gap
      await delay(350);
    }
    triggerDownload(file);
  }
};

/** Bundle `entries` into one ZIP named `name` and download it — one prompt
 *  instead of one per image. */
export const downloadZip = async (
  name: string,
  entries: ZipEntry[]
): Promise<void> => {
  const zip = await createZip(entries);
  triggerDownload(new File([zip], name, { type: "application/zip" }));
};

/** Deliver one export: the share sheet on a phone (a carousel set lands in
 *  Photos as one batch), plain downloads on a desktop. Resolves `blocked` when
 *  the phone needs another tap before it may share — the caller asks for it
 *  and calls `shareFiles` again from that tap. Without a share sheet, a set of
 *  several images comes as one ZIP. */
export const deliverFiles = async (
  files: File[],
  opts: { title: string; zipName: string }
): Promise<"done" | "blocked"> => {
  if (files.length === 0) {
    return "done";
  }
  if (!isDesktopDevice()) {
    const outcome = await shareFiles(files, opts.title);
    if (outcome === "blocked") {
      return "blocked";
    }
    if (outcome !== "unsupported") {
      return "done";
    }
    if (files.length > 1) {
      await downloadZip(
        opts.zipName,
        files.map((file) => ({ file, path: file.name }))
      );
      return "done";
    }
  }
  await downloadFiles(files);
  return "done";
};
