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
// The export overview renders every format's preview at native size, so it can
// run out of memory before any export starts. It gets its own marker.
const OVERVIEW_KEY = "effort:export-overview-open";

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

const removeKey = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage blocked (private mode, sandbox) — crash detection is best-effort.
  }
};

const clearMarker = () => {
  removeKey(MARKER_KEY);
};

const clearOverviewMarker = () => {
  removeKey(OVERVIEW_KEY);
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

/** Names the issue in Sentry ("ExportCrashError: …"), unlike a bare message. */
class ExportCrashError extends Error {
  override name = "ExportCrashError";
  constructor(
    message = "Export did not finish: the tab was reloaded mid-export"
  ) {
    super(message);
  }
}

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

const overviewMarker = z.object({
  kind: z.enum(["card", "carousel"]),
  /** Format previews mounted when the marker was last written. */
  mounted: z.number(),
  slides: z.number().optional(),
  startedAt: z.number(),
});
type OverviewMarker = z.infer<typeof overviewMarker>;

const readOverviewMarker = (): OverviewMarker | null => {
  try {
    const raw = sessionStorage.getItem(OVERVIEW_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = overviewMarker.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/**
 * Arm the overview marker while the export overview is open (and update it as
 * previews mount). Returns the function that clears it on close.
 */
export const watchOverview = (
  marker: Omit<OverviewMarker, "startedAt">
): (() => void) => {
  const startedAt = readOverviewMarker()?.startedAt ?? Date.now();
  try {
    sessionStorage.setItem(
      OVERVIEW_KEY,
      JSON.stringify({ ...marker, startedAt })
    );
  } catch {
    // See removeKey.
  }
  return clearOverviewMarker;
};

const reportUnfinishedOverview = () => {
  const marker = readOverviewMarker();
  if (marker === null) {
    return;
  }
  clearOverviewMarker();
  const { startedAt, ...context } = marker;
  Sentry.captureException(
    new ExportCrashError(
      "Export overview crashed: the tab was reloaded while it was open"
    ),
    {
      contexts: {
        overview: {
          ...context,
          secondsBeforeReload: Math.round((Date.now() - startedAt) / 1000),
        },
      },
      level: "error",
      tags: {
        "export.crash": "true",
        "export.kind": context.kind,
        "export.phase": "overview",
      },
    }
  );
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
  window.addEventListener("pagehide", clearOverviewMarker);
  const marker = readMarker();
  // A crash mid-export also leaves the overview open: report it once, as the
  // export crash.
  if (marker === null) {
    reportUnfinishedOverview();
    return;
  }
  clearOverviewMarker();
  clearMarker();
  const { startedAt, ...context } = marker;
  Sentry.captureException(new ExportCrashError(), {
    contexts: {
      export: {
        ...context,
        secondsBeforeReload: Math.round((Date.now() - startedAt) / 1000),
      },
    },
    level: "error",
    tags: { ...tagsFor(context), "export.crash": "true" },
  });
};
