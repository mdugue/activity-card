"use client";

// The background photo's state cluster: the object URL, the pan/zoom
// transform and the filter/grain effects, plus the lifecycle rules that tie
// them together (a new photo resets the transform and adopts the active
// theme's signature effects; the object URL is revoked exactly once, via the
// effect cleanup). `app/page.tsx` composes this with the visibility flag —
// the `photoBackdrop` switch is deliberately NOT owned here.

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
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
  effects: PhotoEffects;
  setEffects: Dispatch<SetStateAction<PhotoEffects>>;
  setTransform: (transform: ImageTransform) => void;
  transform: ImageTransform;
  url: string | null;
}

export function useCardPhoto(): UseCardPhoto {
  const [url, setUrl] = useState<string | null>(null);
  // Pan/zoom for the background photo in hero themes. Tied to the current
  // photo, so it resets whenever the photo is swapped or removed.
  const [transform, setTransform] =
    useState<ImageTransform>(IDENTITY_TRANSFORM);
  // Rotate / mirror / filter for the photo. Like the transform, tied to the
  // current photo and reset when it's swapped or removed.
  const [effects, setEffects] = useState<PhotoEffects>(NO_EFFECTS);

  // Object URLs need cleanup or they leak into memory. This cleanup is the
  // single owner of revocation — swap, removal and unmount all funnel here,
  // and it runs only after the render that stopped referencing the old URL.
  useEffect(() => {
    if (!url) {
      return;
    }
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const adopt = (file: File | null, policy: ThemePhotoPolicy) => {
    setUrl(file ? URL.createObjectURL(file) : null);
    setTransform(IDENTITY_TRANSFORM);
    setEffects(file ? policyEffects(policy, NO_EFFECTS) : NO_EFFECTS);
  };

  const applyPolicyEffects = (policy: ThemePhotoPolicy) => {
    setEffects((prev) => policyEffects(policy, prev));
  };

  const clear = () => {
    setUrl(null);
    setTransform(IDENTITY_TRANSFORM);
    setEffects(NO_EFFECTS);
  };

  return {
    adopt,
    applyPolicyEffects,
    clear,
    effects,
    setEffects,
    setTransform,
    transform,
    url,
  };
}
