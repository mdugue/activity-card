// Error reporting around the PNG export — the step most likely to fail on a
// phone. A thrown error is reported directly. An out-of-memory kill is not an
// error at all: iOS Safari tears the tab down and reloads it, so no handler
// runs. To still see those, an export leaves a marker in sessionStorage
// (which survives the reload of the same tab) and clears it when it ends; a
// marker still present at the next start means the tab died mid-export.
// `pagehide` clears it too, so closing the tab or navigating away during an
// export is not counted as a crash.

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const MARKER_KEY = "effort:export-in-flight";

export interface ExportContext {
  /** Which export sheet: one card or a carousel strip. */
  kind: "card" | "carousel";
  /** Output format id (e.g. `portrait`). */
  format: string;
  /** Pixel size of the export, when known. */
  width?: number;
  height?: number;
  /** Slides in a carousel export. */
  slides?: number;
}

const exportMarker = z.object({
  format: z.string(),
  height: z.number().optional(),
  kind: z.enum(["card", "carousel"]),
  slides: z.number().optional(),
  startedAt: z.number(),
  width: z.number().optional(),
});
type ExportMarker = z.infer<typeof exportMarker>;

const clearMarker = () => {
  try {
    sessionStorage.removeItem(MARKER_KEY);
  } catch {
    // Storage blocked (private mode, sandbox) — crash detection is best-effort.
  }
};

const writeMarker = (marker: ExportMarker) => {
  try {
    sessionStorage.setItem(MARKER_KEY, JSON.stringify(marker));
  } catch {
    // See clearMarker.
  }
};

const readMarker = (): ExportMarker | null => {
  try {
    const raw = sessionStorage.getItem(MARKER_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = exportMarker.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const tagsFor = (context: ExportContext) => ({
  "export.format": context.format,
  "export.kind": context.kind,
});

/** Run one export, reporting a thrown error and arming the crash marker. */
export const watchExport = async (
  context: ExportContext,
  run: () => Promise<void>
): Promise<void> => {
  Sentry.addBreadcrumb({
    category: "export",
    data: { ...context },
    message: "export started",
  });
  writeMarker({ ...context, startedAt: Date.now() });
  try {
    await run();
  } catch (error) {
    Sentry.captureException(error, {
      contexts: { export: { ...context } },
      tags: tagsFor(context),
    });
    throw error;
  } finally {
    clearMarker();
  }
};

/**
 * At startup: report an export that never finished (the tab was killed), then
 * forget it. Also clears the marker whenever the page is deliberately left.
 */
export const reportUnfinishedExport = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.addEventListener("pagehide", clearMarker);
  const marker = readMarker();
  if (marker === null) {
    return;
  }
  clearMarker();
  const { startedAt, ...context } = marker;
  Sentry.captureMessage(
    "Export did not finish: the tab was reloaded mid-export",
    {
      contexts: {
        export: {
          ...context,
          secondsBeforeReload: Math.round((Date.now() - startedAt) / 1000),
        },
      },
      level: "error",
      tags: { ...tagsFor(context), "export.crash": "true" },
    }
  );
};
