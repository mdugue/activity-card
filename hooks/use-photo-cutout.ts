"use client";

// The photo's foreground layer for "text behind the horizon": estimates the
// photo's depth on the device (`lib/depth.worker.ts`, Depth Anything), cuts it
// at the sky by default or wherever the user taps, and renders the near part of
// the photo as a transparent PNG the theme lays over its headline.
//
// The model is a one-time 27 MB download, so the first run waits for the
// user's consent (`status: "consent"`); once the weights sit in the browser
// cache it runs without asking. Every piece of state is keyed by the photo URL
// it belongs to, so a photo swap never shows a stale cut — the old entries are
// simply ignored until the new photo's arrive.

import { useEffect, useState } from "react";

import type { DepthRequest, DepthResponse } from "@/lib/depth.worker";
import {
  cutAt,
  depthModelUrl,
  foregroundMask,
  MODEL_CACHE,
  skyCut,
} from "@/lib/horizon-depth";
import type { DepthMap } from "@/lib/horizon-depth";
import { fromCallback } from "@/theme/export/export-shared";

export type CutoutStatus = "consent" | "error" | "loading" | "off" | "ready";

export interface UsePhotoCutout {
  /** the user agreed to the model download */
  confirm: () => void;
  /** foreground PNG (object URL) for the current photo, or null */
  foregroundUrl: string | null;
  /** cut where the user tapped (0–1 image coordinates) */
  pickAt: (u: number, v: number) => void;
  /** model download progress (0–1) while loading, else null */
  progress: number | null;
  /** back to the default cut (only the sky behind) */
  resetDepth: () => void;
  status: CutoutStatus;
}

interface Keyed<T> {
  photo: string;
  value: T;
}

interface Phase {
  kind: "consent" | "error" | "loading";
  progress: number | null;
}

// Effect cleanup for the branches that started no work.
const noCleanup = (): void => {
  // Nothing was started, so there is nothing to cancel.
};

const isModelCached = async (): Promise<boolean> => {
  try {
    const cache = await caches.open(MODEL_CACHE);
    const hit = await cache.match(depthModelUrl());
    return hit !== undefined;
  } catch {
    return false;
  }
};

/** Run one depth estimate in a fresh worker, terminated afterwards so the
 *  model's memory is free again before the card is exported. */
const estimateDepth = async (
  photoUrl: string,
  onProgress: (fraction: number) => void
): Promise<DepthMap> => {
  const worker = new Worker(
    new URL("../lib/depth.worker.ts", import.meta.url),
    { type: "module" }
  );
  try {
    return await fromCallback<DepthMap>((resolve, reject) => {
      worker.addEventListener(
        "message",
        (event: MessageEvent<DepthResponse>) => {
          const msg = event.data;
          if (msg.type === "progress") {
            onProgress(msg.total > 0 ? msg.loaded / msg.total : 0);
          } else if (msg.type === "done") {
            resolve({ data: msg.data, h: msg.h, w: msg.w });
          } else {
            reject(new Error(msg.message));
          }
        }
      );
      worker.addEventListener("error", (event) => {
        reject(new Error(event.message || "depth worker failed"));
      });
      const request: DepthRequest = { photoUrl };
      worker.postMessage(request, []);
    });
  } finally {
    worker.terminate();
  }
};

const loadImage = async (src: string): Promise<HTMLImageElement> => {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
};

/** The photo at full size with everything behind the cut made transparent. */
const composeForeground = async (
  photoUrl: string,
  map: DepthMap,
  cut: number
): Promise<string> => {
  const photo = await loadImage(photoUrl);
  const canvas = document.createElement("canvas");
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = map.w;
  maskCanvas.height = map.h;
  const ctx = canvas.getContext("2d");
  const maskCtx = maskCanvas.getContext("2d");
  if (!(ctx && maskCtx)) {
    throw new Error("no 2D canvas");
  }
  ctx.drawImage(photo, 0, 0);
  maskCtx.putImageData(
    new ImageData(foregroundMask(map, cut), map.w, map.h),
    0,
    0
  );
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
  const blob = await fromCallback<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  // Free the backing stores right away — iOS counts live canvas memory.
  canvas.width = 0;
  maskCanvas.width = 0;
  if (!blob) {
    throw new Error("foreground could not be encoded");
  }
  return URL.createObjectURL(blob);
};

/** Depth map per photo: estimated once, after consent unless cached. */
const useDepth = (photoUrl: string | null, active: boolean) => {
  const [consented, setConsented] = useState(false);
  const [phase, setPhase] = useState<Keyed<Phase> | null>(null);
  const [depth, setDepth] = useState<Keyed<DepthMap> | null>(null);
  const depthFor =
    active && photoUrl !== null && depth?.photo === photoUrl
      ? depth.value
      : null;

  useEffect(() => {
    if (!active || photoUrl === null || depthFor !== null) {
      return noCleanup;
    }
    let cancelled = false;
    const update = (value: Phase | null) => {
      if (!cancelled) {
        setPhase(value === null ? null : { photo: photoUrl, value });
      }
    };
    const run = async () => {
      const cached = await isModelCached();
      if (!(consented || cached)) {
        update({ kind: "consent", progress: null });
        return;
      }
      update({ kind: "loading", progress: null });
      try {
        const map = await estimateDepth(photoUrl, (fraction) => {
          update({ kind: "loading", progress: fraction });
        });
        if (!cancelled) {
          setDepth({ photo: photoUrl, value: map });
        }
        update(null);
      } catch {
        update({ kind: "error", progress: null });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [active, consented, depthFor, photoUrl]);

  const current = active && phase?.photo === photoUrl ? phase.value : null;
  return {
    confirm: () => {
      setConsented(true);
    },
    current,
    depthFor,
  };
};

/** The foreground PNG for the current cut, re-rendered when the cut moves. */
const useForeground = (
  photoUrl: string | null,
  depthFor: DepthMap | null,
  cutFor: number | null
) => {
  const [foreground, setForeground] = useState<Keyed<string> | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (depthFor === null || cutFor === null || photoUrl === null) {
      return noCleanup;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const url = await composeForeground(photoUrl, depthFor, cutFor);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setForeground({ photo: photoUrl, value: url });
      } catch {
        if (!cancelled) {
          setFailed(photoUrl);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [cutFor, depthFor, photoUrl]);

  // Single owner of revocation, like the photo URL itself (use-card-photo).
  useEffect(
    () => () => {
      if (foreground !== null) {
        URL.revokeObjectURL(foreground.value);
      }
    },
    [foreground]
  );

  return {
    failed: photoUrl !== null && failed === photoUrl,
    url: foreground?.photo === photoUrl ? foreground.value : null,
  };
};

const statusOf = (
  active: boolean,
  phase: Phase | null,
  failed: boolean,
  ready: boolean
): CutoutStatus => {
  if (!active) {
    return "off";
  }
  if (failed) {
    return "error";
  }
  if (phase) {
    return phase.kind;
  }
  return ready ? "ready" : "loading";
};

/**
 * @param photoUrl the current background photo (null when none)
 * @param enabled the theme's "text behind the horizon" switch is on and the
 *   photo is shown
 */
export const usePhotoCutout = (
  photoUrl: string | null,
  enabled: boolean
): UsePhotoCutout => {
  const active = enabled && photoUrl !== null && photoUrl !== "";
  const { confirm, current, depthFor } = useDepth(photoUrl, active);
  // The user's cut; until they tap, the sky cut of the current depth map.
  const [picked, setPicked] = useState<Keyed<number> | null>(null);
  let cutFor: number | null = null;
  if (depthFor !== null) {
    cutFor = picked?.photo === photoUrl ? picked.value : skyCut(depthFor);
  }
  const foreground = useForeground(photoUrl, depthFor, cutFor);
  const foregroundUrl = active ? foreground.url : null;

  return {
    confirm,
    foregroundUrl,
    pickAt: (u, v) => {
      if (depthFor !== null && photoUrl !== null) {
        setPicked({ photo: photoUrl, value: cutAt(depthFor, u, v) });
      }
    },
    progress: current?.kind === "loading" ? current.progress : null,
    resetDepth: () => {
      setPicked(null);
    },
    status: statusOf(
      active,
      current,
      foreground.failed,
      foregroundUrl !== null
    ),
  };
};
