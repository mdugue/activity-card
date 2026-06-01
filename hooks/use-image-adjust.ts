"use client";

import { useEffect, useRef } from "react";
import {
  CARD_WIDTH,
  clampTransform,
  IDENTITY_TRANSFORM,
  type ImageTransform,
} from "@/lib/image-transform";

interface PointerPos {
  x: number;
  y: number;
}

interface GestureSnapshot {
  centroid: PointerPos;
  distance: number;
  // Screen-px → card-px factor at gesture start (preview is scaled down).
  previewScale: number;
  transform: ImageTransform;
}

interface UseImageAdjustArgs {
  enabled: boolean;
  onChange: (next: ImageTransform) => void;
  transform: ImageTransform;
}

function centroidOf(pts: PointerPos[]): PointerPos {
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

function avgDistanceFromCentroid(pts: PointerPos[], c: PointerPos): number {
  if (pts.length < 2) {
    return 0;
  }
  const d = pts.reduce((acc, p) => acc + Math.hypot(p.x - c.x, p.y - c.y), 0);
  return d / pts.length;
}

/**
 * Drag-to-pan, pinch-to-zoom (touch) and scroll-to-zoom (desktop) on a single
 * overlay element. The overlay is expected to sit above the preview card and
 * to `stopPropagation` on pointer events so the surrounding theme carousel
 * (Embla) never starts a swipe — that's how the two gestures coexist.
 *
 * Reads the live `transform` and `onChange` through refs so the native
 * listeners bind once per `enabled` toggle rather than on every transform tick.
 */
export function useImageAdjust({
  enabled,
  transform,
  onChange,
}: UseImageAdjustArgs) {
  const ref = useRef<HTMLDivElement>(null);

  // Mirror the latest props so the native listeners (bound once per `enabled`
  // toggle) always read current values without rebinding every transform tick.
  const transformRef = useRef(transform);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    transformRef.current = transform;
    onChangeRef.current = onChange;
  });

  const pointersRef = useRef<Map<number, PointerPos>>(new Map());
  const gestureRef = useRef<GestureSnapshot | null>(null);

  // Rebase the gesture snapshot to the current pointer set + transform. Called
  // whenever a pointer is added or lifted so pan/zoom stay continuous.
  const rebase = useRef(() => {
    const el = ref.current;
    const pts = [...pointersRef.current.values()];
    if (!el || pts.length === 0) {
      gestureRef.current = null;
      return;
    }
    const rect = el.getBoundingClientRect();
    const centroid = centroidOf(pts);
    gestureRef.current = {
      centroid,
      distance: avgDistanceFromCentroid(pts, centroid),
      previewScale: rect.width / CARD_WIDTH || 1,
      transform: transformRef.current,
    };
  });

  useEffect(() => {
    const el = ref.current;
    if (!(enabled && el)) {
      return;
    }

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      rebase.current();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gestureRef.current;
      if (!g) {
        return;
      }
      const pts = [...pointersRef.current.values()];
      const centroid = centroidOf(pts);
      const distance = avgDistanceFromCentroid(pts, centroid);
      const scaleFactor =
        pts.length >= 2 && g.distance > 0 ? distance / g.distance : 1;
      onChangeRef.current(
        clampTransform({
          scale: g.transform.scale * scaleFactor,
          x: g.transform.x + (centroid.x - g.centroid.x) / g.previewScale,
          y: g.transform.y + (centroid.y - g.centroid.y) / g.previewScale,
        })
      );
    };

    const endPointer = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) {
        return;
      }
      e.stopPropagation();
      pointersRef.current.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      rebase.current();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = Math.exp(-e.deltaY * 0.0015);
      const current = transformRef.current;
      onChangeRef.current(
        clampTransform({
          scale: current.scale * factor,
          x: current.x,
          y: current.y,
        })
      );
    };

    const onDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChangeRef.current(IDENTITY_TRANSFORM);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);
    // Non-passive so we can cancel the page's scroll/zoom while adjusting.
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDoubleClick);

    // Same Map instance the handlers mutate; capture it so the cleanup clears
    // the live set rather than a ref that may have moved on.
    const pointers = pointersRef.current;
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endPointer);
      el.removeEventListener("pointercancel", endPointer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDoubleClick);
      pointers.clear();
      gestureRef.current = null;
    };
  }, [enabled]);

  return { ref };
}
