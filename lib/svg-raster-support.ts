// Feature probe: does this browser paint a real-sized bitmap that is embedded
// in an SVG-as-image?
//
// Every DOM-to-PNG pipeline (snapdom included) serialises the node into an SVG
// `<foreignObject>`, loads it through an `<img>` and rasterises that. WebKit
// renders SVG images in a restricted context, and it drops their embedded
// bitmaps once they pass roughly a tenth of a megapixel: a 256×192 photo comes
// through, a 512×384 one doesn't, and every real photo is far bigger. That is
// why a photo-led card exported from Safari — the report this exists for was an
// iPhone, a Strava photo and the Altitude theme — came out with its background
// missing while the type and the elevation line survived. Chromium and Firefox
// have no such limit, and neither does the on-screen preview, which is why the
// card looks right until it is exported.
//
// The engines that fail the probe take the compositing path
// (`theme/export/photo-composite.ts`), which paints the photo onto the output
// canvas directly and never asks the SVG to carry it.
//
// A capability probe, not a UA sniff: whichever engine paints the bitmap gets
// the straight, cheaper capture, and Safari stops paying for the fallback the
// day WebKit lifts the limit.

/** Probe dimensions: WebKit paints a tiny embedded bitmap but drops anything
 *  from roughly a tenth of a megapixel upward — the probe has to be big enough
 *  to land on the far side of that, and small enough to cost nothing. Every
 *  real photo is far larger still. */
const PROBE_W = 512;
const PROBE_H = 384;

/** A solid magenta 512×384 PNG (it deflates to ~1KB). */
const PROBE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAGACAIAAABUQk3oAAAEPUlEQVR42u3VMQ0AAAzDsPIn3eGoZskI8iRNAXgoEgAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQAYgAoABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAABqACgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAGIAEAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAAAagAoABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAIABqABgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgCAAQBgAAAYAAAGAIABAGAAABgAAAYAgAEAYAAAGAAABgBgAAAYAAAGAIABAGAAABgAAAYAwJID5xJZpwWdQ6oAAAAASUVORK5CYII=";

const PROBE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${PROBE_W}" height="${PROBE_H}"><foreignObject width="${PROBE_W}" height="${PROBE_H}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${PROBE_W}px;height:${PROBE_H}px;background-image:url(${PROBE_PNG});background-size:cover"></div></foreignObject></svg>`;

let probe: Promise<boolean> | null = null;

async function runProbe(): Promise<boolean> {
  if (typeof document === "undefined") {
    return true;
  }
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PROBE_SVG)}`;
    await img.decode();
    // Read back at 1×1: only "did the bitmap paint at all" matters, and a
    // one-pixel canvas keeps the probe free.
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return true;
    }
    ctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    // Magenta means the embedded bitmap painted; anything else (typically fully
    // transparent) means the engine dropped it.
    return a > 200 && r > 200 && b > 200 && g < 80;
  } catch {
    // A throw here (tainted canvas, decode failure) is itself a sign the
    // straight path can't be trusted — take the compositing fallback.
    return false;
  }
}

/** Memoised — one probe per document, shared by every export. */
export function canRasterizeEmbeddedImages(): Promise<boolean> {
  probe ??= runProbe();
  return probe;
}

/** Test seam: forget the memoised result (used by unit tests only). */
export function resetRasterSupportProbe(): void {
  probe = null;
}
