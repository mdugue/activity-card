// Paint the background photo onto the export canvas ourselves, for the engines
// that refuse to rasterise it (WebKit — see `lib/svg-raster-support.ts`).
//
// The naive fix — "capture without the photo, draw the photo underneath" —
// doesn't work: the card's own background sits between the two and would hide
// it, and knowing which ancestor paints it would drag theme internals into the
// exporter. So instead we measure what the card does to whatever is behind the
// photo, with two probe captures:
//
//   A = the card rasterised with every photo layer filled solid BLACK
//   B = the same, filled solid WHITE
//
// Everything painted over the photo — scrims, grain, text, masks, layer
// opacity, `multiply` overlays — composites linearly onto that fill, so per
// channel `A = over` and `B = over + (1 - a)·255`, where `a` is the coverage of
// everything above. The photo's true pixel `P` therefore lands at
// `A + (B - A)·P / 255`, with no knowledge of the theme at all. The photo
// itself is drawn from its published `data-effort-photo` descriptor.

import {
  coverRectAroundCentre,
  decodePhotoDraw,
  PHOTO_LAYER_ATTR,
  PHOTO_PAINT_ATTR,
  resolvePhotoBox,
} from "@/lib/photo-draw";
import type { PhotoDraw, Rect } from "@/lib/photo-draw";

export interface RasterSize {
  height: number;
  width: number;
}

/** Rasterise `node` at an exact pixel size — the one call both pipelines share. */
export type Rasterize = (size: RasterSize) => Promise<HTMLCanvasElement>;

interface Layer {
  draw: PhotoDraw;
  el: HTMLElement;
  paint: HTMLElement | null;
  /** the container's box in output pixels */
  rect: Rect;
}

interface Collected {
  layers: Layer[];
  /** output pixels per card pixel (the descriptor's unit) */
  scale: number;
}

/** Collect the photo layers inside `node`, already mapped to output pixels. */
function collectLayers(node: HTMLElement, size: RasterSize): Collected {
  const root = node.getBoundingClientRect();
  // The export mount is shown scaled-to-fit inside its tile, so measured client
  // rects are not card pixels — rebase through the node's own rect, and take
  // the card-pixel scale from its untransformed layout width.
  if (!(root.width > 0 && root.height > 0 && node.offsetWidth > 0)) {
    return { layers: [], scale: 1 };
  }
  const sx = size.width / root.width;
  const sy = size.height / root.height;
  const scale = size.width / node.offsetWidth;
  const layers: Layer[] = [];
  for (const el of node.querySelectorAll<HTMLElement>(
    `[${PHOTO_LAYER_ATTR}]`
  )) {
    const draw = decodePhotoDraw(el.getAttribute(PHOTO_LAYER_ATTR));
    if (!draw) {
      continue;
    }
    const box = el.getBoundingClientRect();
    if (!(box.width > 0 && box.height > 0)) {
      continue;
    }
    layers.push({
      draw,
      el,
      paint: el.querySelector<HTMLElement>(`[${PHOTO_PAINT_ATTR}]`),
      rect: {
        x: (box.left - root.left) * sx,
        y: (box.top - root.top) * sy,
        w: box.width * sx,
        h: box.height * sy,
      },
    });
  }
  return { layers, scale };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () =>
      reject(new Error(`photo failed to load: ${src}`))
    );
    img.src = src;
  });
}

/** Repaint one layer onto the photo plane, mirroring what the DOM would show:
 *  cover-fit inside the painting box, clipped to it, transformed about its
 *  centre, with the element's own filter and opacity. */
function paintLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  image: HTMLImageElement,
  scale: number
): void {
  const { draw, rect } = layer;
  // The descriptor's box is in card pixels relative to the container; the
  // container's measured rect is already in output pixels.
  const box = resolvePhotoBox(draw.box, rect.w / scale, rect.h / scale);
  const cover = coverRectAroundCentre(
    box,
    image.naturalWidth,
    image.naturalHeight
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.translate(rect.x, rect.y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = draw.opacity;
  if (draw.filter) {
    // Unsupported in older WebKit; an ignored filter still beats no photo.
    ctx.filter = draw.filter;
  }

  ctx.translate(box.x + box.w / 2 + draw.x, box.y + box.h / 2 + draw.y);
  ctx.scale(draw.scale, draw.scale);
  ctx.rotate((draw.rotate * Math.PI) / 180);
  ctx.scale(draw.flipH ? -1 : 1, draw.flipV ? -1 : 1);
  ctx.beginPath();
  ctx.rect(-box.w / 2, -box.h / 2, box.w, box.h);
  ctx.clip();
  ctx.drawImage(image, cover.x, cover.y, cover.w, cover.h);
  ctx.restore();
}

/**
 * Reconstruct the real pixels from the two probes and the photo plane:
 * `A + (B - A)·P/255`, faded in by the photo's own coverage so a pixel the
 * photo doesn't reach keeps the black-probe value it already had.
 * Mutates and returns `a`.
 */
export function mergeProbes(
  a: ImageData,
  b: ImageData,
  p: ImageData
): ImageData {
  const av = a.data;
  const bv = b.data;
  const pv = p.data;
  for (let i = 0; i < av.length; i += 4) {
    const coverage = pv[i + 3] / 255;
    if (coverage === 0) {
      continue;
    }
    for (let c = 0; c < 4; c++) {
      const base = av[i + c];
      const withPhoto = base + ((bv[i + c] - base) * pv[i + c]) / 255;
      av[i + c] = base + (withPhoto - base) * coverage;
    }
  }
  return a;
}

/** Pixels per merge band — a few megapixels at a time keeps the intermediate
 *  buffers small without making the loop chatty. */
const BAND_PIXELS = 4_000_000;

/** Release a canvas's backing store — iOS is strict about live canvas memory. */
function release(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Rasterise `node` with its photo layers composited in. Returns null when there
 * is nothing to composite (no photo, or the photo can't be read) so the caller
 * can fall back to the straight capture.
 */
export async function rasterizeWithPhotoComposite(
  node: HTMLElement,
  size: RasterSize,
  rasterize: Rasterize
): Promise<HTMLCanvasElement | null> {
  const { layers, scale } = collectLayers(node, size);
  if (layers.length === 0) {
    return null;
  }
  const images = new Map<string, HTMLImageElement>();
  for (const layer of layers) {
    if (!images.has(layer.draw.src)) {
      images.set(layer.draw.src, await loadImage(layer.draw.src));
    }
  }

  // Probe passes: blank the photo paint (so the result is identical on every
  // engine, not only the ones that drop it) and fill the layer solid.
  const saved = layers.map((layer) => ({
    layer,
    background: layer.el.style.background,
    paintImage: layer.paint?.style.backgroundImage ?? "",
  }));
  const setProbe = (fill: string) => {
    for (const { layer } of saved) {
      layer.el.style.background = fill;
      if (layer.paint) {
        layer.paint.style.backgroundImage = "none";
      }
    }
  };
  const restore = () => {
    for (const entry of saved) {
      entry.layer.el.style.background = entry.background;
      if (entry.layer.paint) {
        entry.layer.paint.style.backgroundImage = entry.paintImage;
      }
    }
  };

  let black: HTMLCanvasElement;
  let white: HTMLCanvasElement;
  try {
    setProbe("#000");
    black = await rasterize(size);
    setProbe("#fff");
    white = await rasterize(size);
  } finally {
    restore();
  }

  const blackCtx = black.getContext("2d", { willReadFrequently: true });
  const whiteCtx = white.getContext("2d", { willReadFrequently: true });
  if (!(blackCtx && whiteCtx)) {
    release(white);
    return black;
  }

  // Merge in horizontal bands: three full-size pixel buffers of a carousel
  // strip would be ~200MB, which is exactly the kind of allocation a phone
  // refuses. One band's worth of photo plane is enough at a time.
  const bandH = Math.max(
    1,
    Math.min(black.height, Math.floor(BAND_PIXELS / black.width))
  );
  const plane = document.createElement("canvas");
  plane.width = black.width;
  plane.height = bandH;
  const planeCtx = plane.getContext("2d", { willReadFrequently: true });
  if (!planeCtx) {
    release(white);
    release(plane);
    return black;
  }

  for (let y = 0; y < black.height; y += bandH) {
    const h = Math.min(bandH, black.height - y);
    planeCtx.clearRect(0, 0, plane.width, plane.height);
    planeCtx.save();
    planeCtx.translate(0, -y);
    for (const layer of layers) {
      const image = images.get(layer.draw.src);
      if (image) {
        paintLayer(planeCtx, layer, image, scale);
      }
    }
    planeCtx.restore();
    const merged = mergeProbes(
      blackCtx.getImageData(0, y, black.width, h),
      whiteCtx.getImageData(0, y, black.width, h),
      planeCtx.getImageData(0, 0, black.width, h)
    );
    blackCtx.putImageData(merged, 0, y);
  }

  release(white);
  release(plane);
  return black;
}
