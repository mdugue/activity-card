"use client";

// The background photo's state cluster: the object URL, the pan/zoom
// transform and the filter/grain effects, plus the lifecycle rules that tie
// them together (a new photo resets the transform and adopts the active
// theme's signature effects; the object URL is revoked exactly once, via the
// effect cleanup). `app/page.tsx` composes this with the visibility flag —
// the `photoBackdrop` switch is deliberately NOT owned here.

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { downscalePhoto } from "@/lib/downscale-image";
import { IDENTITY_TRANSFORM, type ImageTransform } from "@/lib/image-transform";
import { NO_EFFECTS, type PhotoEffects } from "@/lib/photo-effects";
import type { ThemePhotoPolicy } from "@/theme/core/theme-contract";

/** A theme's photo effects (its signature filter + grain) over a base. */
function policyEffects(
  policy: ThemePhotoPolicy,
  base: PhotoEffects
): PhotoEffects {
  return {
    ...base,
    filter: policy.defaultFilter ?? "none",
    grain: policy.defaultGrain ?? false,
  };
}

export interface UseCardPhoto {
  /** Swap in a new photo file (or remove with `null`). Resets pan/zoom; a
   * fresh photo adopts the given theme policy's effects from scratch (never
   * carried over from the previous photo). */
  adopt: (file: File | null, policy: ThemePhotoPolicy) => void;
  /** Re-apply a newly selected theme's signature filter + grain over the
   * current photo (no-op state change when identical). */
  applyPolicyEffects: (policy: ThemePhotoPolicy) => void;
  /** Drop the photo and reset transform + effects (e.g. "start over"). */
  clear: () => void;
  /** Lighter, downscaled proxy URL for on-screen preview rendering (editor,
   * slide strip, export-sheet previews). Falls back to the full-res `url` until
   * the proxy is generated, or if downscaling is unavailable/unneeded. Never use
   * this as an export source — exports must rasterise the full-res `url`. */
  displayUrl: string | null;
  effects: PhotoEffects;
  setEffects: Dispatch<SetStateAction<PhotoEffects>>;
  setTransform: (transform: ImageTransform) => void;
  transform: ImageTransform;
  /** Full-resolution object URL — the export source. */
  url: string | null;
}

export function useCardPhoto(): UseCardPhoto {
  const [url, setUrl] = useState<string | null>(null);
  // The downscaled preview proxy (generated asynchronously after adopt). Null
  // until ready / when not worth downscaling — callers fall back to `url`.
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  // Pan/zoom for the background photo in hero themes. Tied to the current
  // photo, so it resets whenever the photo is swapped or removed.
  const [transform, setTransform] =
    useState<ImageTransform>(IDENTITY_TRANSFORM);
  // Rotate / mirror / filter for the photo. Like the transform, tied to the
  // current photo and reset when it's swapped or removed.
  const [effects, setEffects] = useState<PhotoEffects>(NO_EFFECTS);

  // Each adopt/clear bumps this. An in-flight proxy decode whose token is stale
  // by the time it resolves is discarded (and its URL revoked), so a quick
  // re-pick can never install the previous photo's proxy.
  const genRef = useRef(0);

  // Object URLs need cleanup or they leak into memory. Full-res and proxy each
  // own a revoke effect; it runs only after the render that stopped referencing
  // the old URL (swap, removal and unmount all funnel through state changes).
  useEffect(() => {
    if (!url) {
      return;
    }
    return () => URL.revokeObjectURL(url);
  }, [url]);
  useEffect(() => {
    if (!proxyUrl) {
      return;
    }
    return () => URL.revokeObjectURL(proxyUrl);
  }, [proxyUrl]);

  const adopt = (file: File | null, policy: ThemePhotoPolicy) => {
    genRef.current += 1;
    const gen = genRef.current;
    setUrl(file ? URL.createObjectURL(file) : null);
    setProxyUrl(null);
    setTransform(IDENTITY_TRANSFORM);
    setEffects(file ? policyEffects(policy, NO_EFFECTS) : NO_EFFECTS);
    if (file) {
      // Build the lighter preview proxy off the main thread's critical path.
      downscalePhoto(file).then((proxy) => {
        if (!proxy) {
          return;
        }
        if (gen !== genRef.current) {
          URL.revokeObjectURL(proxy); // superseded by a newer photo — don't leak
          return;
        }
        setProxyUrl(proxy);
      });
    }
  };

  const applyPolicyEffects = (policy: ThemePhotoPolicy) => {
    setEffects((prev) => policyEffects(policy, prev));
  };

  const clear = () => {
    genRef.current += 1;
    setUrl(null);
    setProxyUrl(null);
    setTransform(IDENTITY_TRANSFORM);
    setEffects(NO_EFFECTS);
  };

  return {
    adopt,
    applyPolicyEffects,
    clear,
    displayUrl: proxyUrl ?? url,
    effects,
    setEffects,
    setTransform,
    transform,
    url,
  };
}
