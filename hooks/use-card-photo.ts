"use client";

// The background photo's state cluster: the object URL, the pan/zoom
// transform and the filter/grain effects, plus the lifecycle rules that tie
// them together (a new photo resets the transform and adopts the active
// theme's signature effects; the object URL is revoked exactly once, via the
// effect cleanup). `app/page.tsx` composes this with the visibility flag —
// the `photoBackdrop` switch is deliberately NOT owned here.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { IDENTITY_TRANSFORM } from "@/lib/image-transform";
import type { ImageTransform } from "@/lib/image-transform";
import { NO_EFFECTS } from "@/lib/photo-effects";
import type { PhotoEffects } from "@/lib/photo-effects";
import { capPhotoResolution } from "@/lib/photo-resize";
import type { ThemePhotoPolicy } from "@/theme/core/theme-contract";

/** A theme's photo effects (its signature filter + grain) over a base. */
const policyEffects = (
  policy: ThemePhotoPolicy,
  base: PhotoEffects
): PhotoEffects => ({
  ...base,
  filter: policy.defaultFilter ?? "none",
  grain: policy.defaultGrain ?? false,
});

export interface UseCardPhoto {
  /** Swap in a new photo file (or remove with `null`). Oversized photos are
   * capped first (lib/photo-resize). Resets pan/zoom; a fresh photo adopts the
   * active theme policy's effects from scratch (never carried over from the
   * previous photo). Resolves to the policy it adopted with, or `null` when a
   * newer change (another pick, a removal, `clear`) superseded it while the
   * photo was being capped — a stale resize never lands. */
  adopt: (file: File | null) => Promise<ThemePhotoPolicy | null>;
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

/** @param activePolicy the active theme's photo policy — read when a capped
 *  photo lands, not when it was picked, so a theme switch mid-resize wins. */
export const useCardPhoto = (activePolicy: ThemePhotoPolicy): UseCardPhoto => {
  const [url, setUrl] = useState<string | null>(null);
  const policyRef = useRef(activePolicy);
  // Layout effect, not passive: it runs synchronously in the commit, so a
  // resize promise resolving right after a theme switch already sees the new
  // policy (a passive effect would leave a gap before it runs).
  useLayoutEffect(() => {
    policyRef.current = activePolicy;
  }, [activePolicy]);
  // Bumped by every adopt/clear; an async adopt only lands if it's still the
  // latest request once its resize resolves.
  const requestRef = useRef(0);
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
  useEffect(
    () => () => {
      if (url !== null && url !== "") {
        URL.revokeObjectURL(url);
      }
    },
    [url]
  );

  const adopt = async (file: File | null) => {
    requestRef.current += 1;
    const request = requestRef.current;
    const capped = file ? await capPhotoResolution(file) : null;
    if (request !== requestRef.current) {
      return null;
    }
    const policy = policyRef.current;
    setUrl(capped ? URL.createObjectURL(capped) : null);
    setTransform(IDENTITY_TRANSFORM);
    setEffects(capped ? policyEffects(policy, NO_EFFECTS) : NO_EFFECTS);
    return policy;
  };

  const applyPolicyEffects = (policy: ThemePhotoPolicy) => {
    setEffects((prev) => policyEffects(policy, prev));
  };

  const clear = () => {
    // Also drops any photo still being capped.
    requestRef.current += 1;
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
};
