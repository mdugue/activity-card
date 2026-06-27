"use client";

import { useEffect, useRef } from "react";
import {
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
  /** Override the clamp (e.g. carousel cover-overflow); defaults to the
   *  single-card 1080×1350 cover clamp. */
  clamp?: (t: ImageTransform) => ImageTransform;
  /** Card-space width of the box the overlay sits over (the active format's
   *  width / one slide), used to convert a screen-px drag into card-px. Pan
   *  mis-scales on non-1080-wide formats (x-landscape) if this is wrong. */
  contentWidth: number;
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
  clamp,
  contentWidth,
}: UseImageAdjustArgs) {
  const ref = useRef<HTMLDivElement>(null);

  // Mirror the latest props so the native listeners (bound once per `enabled`
  // toggle) always read current values without rebinding every transform tick.
  const transformRef = useRef(transform);
  const onChangeRef = useRef(onChange);
  const clampRef =
    useRef<(t: ImageTransform) => ImageTransform>(clampTransform);
  const contentWidthRef = useRef(contentWidth);
  useEffect(() => {
    transformRef.current = transform;
    onChangeRef.current = onChange;
    clampRef.current = clamp ?? clampTransform;
    contentWidthRef.current = contentWidth;
  });

  const pointersRef = useRef<Map<number, PointerPos>>(new Map());
  const gestureRef = useRef<GestureSnapshot | null>(null);

  // Pointer/wheel events fire far faster than the display refreshes (60–120+/s
  // on iOS touch). Coalesce them: stash the latest transform and flush at most
  // once per frame via rAF. Without this, every raw move re-rendered the whole
  // carousel strip (and its N slide-strip decks), which exhausts iOS Safari.
  const pendingRef = useRef<ImageTransform | null>(null);
  const rafRef = useRef<number | null>(null);

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
      previewScale: rect.width / contentWidthRef.current || 1,
      transform: transformRef.current,
    };
  });

  useEffect(() => {
    const el = ref.current;
    if (!(enabled && el)) {
      return;
    }

    // Flush the latest pending transform once per animation frame.
    const flush = () => {
      rafRef.current = null;
      const next = pendingRef.current;
      if (next) {
        pendingRef.current = null;
        onChangeRef.current(next);
      }
    };
    const commit = (next: ImageTransform) => {
      pendingRef.current = next;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

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
      commit(
        clampRef.current({
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
      // Accumulate off the not-yet-flushed value so several wheel ticks in one
      // frame compound, rather than each reading the same stale committed prop.
      const current = pendingRef.current ?? transformRef.current;
      commit(
        clampRef.current({
          scale: current.scale * factor,
          x: current.x,
          y: current.y,
        })
      );
    };

    const onDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Drop any queued move so it can't clobber the reset on the next frame.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = null;
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = null;
      pointers.clear();
      gestureRef.current = null;
    };
  }, [enabled]);

  return { ref };
}
