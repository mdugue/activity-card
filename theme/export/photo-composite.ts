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
//
// A foreground cut-out ("text behind the horizon") sits ABOVE some of the
// theme's layers, and its transparent pixels must show what lies beneath, so a
// solid probe fill can't stand in for it. It takes two more probes: `L`, the
// card composited as above with the cut-out hidden, and `A2`/`B2` with the
// cut-out's layer filled black/white (which covers everything under it). Then
// `X = A2 + (B2 - A2)·F / 255` is the card as if the cut-out were opaque, and
// the real pixel is `L + (X - L)·m`, with `m` the cut-out's own alpha.

import {
  coverRectAroundCentre,
  decodePhotoDraw,
  PHOTO_LAYER_ATTR,
  PHOTO_PAINT_ATTR,
  resolvePhotoBox,
} from "@/lib/photo-draw";
import type { PhotoDraw, Rect } from "@/lib/photo-draw";

import { fromCallback } from "./export-shared";

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

/** One photo layer mapped to output pixels, or null when it carries no valid
 *  descriptor or has no painted box. */
const measureLayer = (
  el: HTMLElement,
  root: DOMRect,
  sx: number,
  sy: number
): Layer | null => {
  const draw = decodePhotoDraw(el.getAttribute(PHOTO_LAYER_ATTR));
  if (!draw) {
    return null;
  }
  const box = el.getBoundingClientRect();
  if (!(box.width > 0 && box.height > 0)) {
    return null;
  }
  return {
    draw,
    el,
    paint: el.querySelector<HTMLElement>(`[${PHOTO_PAINT_ATTR}]`),
    rect: {
      h: box.height * sy,
      w: box.width * sx,
      x: (box.left - root.left) * sx,
      y: (box.top - root.top) * sy,
    },
  };
};

/** Collect the photo layers inside `node`, already mapped to output pixels. */
const collectLayers = (node: HTMLElement, size: RasterSize): Collected => {
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
    const layer = measureLayer(el, root, sx, sy);
    if (layer) {
      layers.push(layer);
    }
  }
  return { layers, scale };
};

const loadImage = async (src: string): Promise<HTMLImageElement> =>
  await fromCallback<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => {
      resolve(img);
    });
    img.addEventListener("error", () => {
      reject(new Error(`photo failed to load: ${src}`));
    });
    img.src = src;
  });

/** Repaint one layer onto the photo plane, mirroring what the DOM would show:
 *  cover-fit inside the painting box, clipped to it, transformed about its
 *  centre, with the element's own filter and opacity. */
const paintLayer = (
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  image: HTMLImageElement,
  scale: number
): void => {
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
};

/**
 * Reconstruct the real pixels from the two probes and the photo plane:
 * `A + (B - A)·P/255`, faded in by the photo's own coverage so a pixel the
 * photo doesn't reach keeps the black-probe value it already had.
 * Mutates and returns `a`.
 */
export const mergeProbes = (
  a: ImageData,
  b: ImageData,
  p: ImageData
): ImageData => {
  const av = a.data;
  const bv = b.data;
  const pv = p.data;
  for (let i = 0; i < av.length; i += 4) {
    const coverage = pv[i + 3] / 255;
    if (coverage === 0) {
      continue;
    }
    for (let c = 0; c < 4; c += 1) {
      const base = av[i + c];
      const withPhoto = base + ((bv[i + c] - base) * pv[i + c]) / 255;
      av[i + c] = base + (withPhoto - base) * coverage;
    }
  }
  return a;
};

/**
 * Lay the foreground cut-out into a card composited without it: `x` is the
 * card with the cut-out painted opaque (from its probes `a2`/`b2` and its
 * plane `f`), blended over `lo` by the cut-out's alpha. Mutates and returns
 * `lo`.
 */
export const mergeForeground = (
  lo: ImageData,
  a2: ImageData,
  b2: ImageData,
  f: ImageData
): ImageData => {
  const lv = lo.data;
  const av = a2.data;
  const bv = b2.data;
  const fv = f.data;
  for (let i = 0; i < lv.length; i += 4) {
    const coverage = fv[i + 3] / 255;
    if (coverage === 0) {
      continue;
    }
    for (let c = 0; c < 4; c += 1) {
      // The cut-out's colour, as if fully opaque (alpha 255).
      const paint = c === 3 ? 255 : fv[i + c];
      const opaque = av[i + c] + ((bv[i + c] - av[i + c]) * paint) / 255;
      lv[i + c] += (opaque - lv[i + c]) * coverage;
    }
  }
  return lo;
};

/** Pixels per merge band — a few megapixels at a time keeps the intermediate
 *  buffers small without making the loop chatty. */
const BAND_PIXELS = 4_000_000;

/** Release a canvas's backing store — iOS is strict about live canvas memory. */
const release = (canvas: HTMLCanvasElement): void => {
  canvas.width = 0;
  canvas.height = 0;
};

interface Probes {
  black: HTMLCanvasElement;
  white: HTMLCanvasElement;
}

/**
 * Rasterise twice with every probe layer filled solid black, then white. The
 * photo paint of EVERY layer is blanked meanwhile (so the result is identical on
 * every engine, not only the ones that drop it), and `hidden` layers are hidden
 * outright. Restores the DOM whatever happens.
 */
const capturePair = async (
  all: Layer[],
  filled: Layer[],
  hidden: Layer[],
  size: RasterSize,
  rasterize: Rasterize
): Promise<Probes> => {
  const saved = all.map((layer) => ({
    background: layer.el.style.background,
    layer,
    paintImage: layer.paint?.style.backgroundImage ?? "",
    visibility: layer.el.style.visibility,
  }));
  const setProbe = (fill: string) => {
    for (const { layer } of saved) {
      if (layer.paint) {
        layer.paint.style.backgroundImage = "none";
      }
    }
    for (const layer of filled) {
      layer.el.style.background = fill;
    }
    for (const layer of hidden) {
      layer.el.style.visibility = "hidden";
    }
  };
  const restore = () => {
    for (const entry of saved) {
      entry.layer.el.style.background = entry.background;
      entry.layer.el.style.visibility = entry.visibility;
      if (entry.layer.paint) {
        entry.layer.paint.style.backgroundImage = entry.paintImage;
      }
    }
  };
  try {
    setProbe("#000");
    const black = await rasterize(size);
    setProbe("#fff");
    const white = await rasterize(size);
    return { black, white };
  } finally {
    restore();
  }
};

/** Run `merge` band by band over `target` (see BAND_PIXELS), with a scratch
 *  plane holding `layers` painted for the current band. */
const mergeInBands = (
  target: CanvasRenderingContext2D,
  size: { height: number; width: number },
  layers: Layer[],
  images: Map<string, HTMLImageElement>,
  scale: number,
  merge: (y: number, h: number, plane: ImageData) => ImageData
): boolean => {
  const bandH = Math.max(
    1,
    Math.min(size.height, Math.floor(BAND_PIXELS / size.width))
  );
  const plane = document.createElement("canvas");
  plane.width = size.width;
  plane.height = bandH;
  const planeCtx = plane.getContext("2d", { willReadFrequently: true });
  if (!planeCtx) {
    release(plane);
    return false;
  }
  for (let y = 0; y < size.height; y += bandH) {
    const h = Math.min(bandH, size.height - y);
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
    target.putImageData(
      merge(y, h, planeCtx.getImageData(0, 0, size.width, h)),
      0,
      y
    );
  }
  release(plane);
  return true;
};

const readable = (canvas: HTMLCanvasElement) =>
  canvas.getContext("2d", { willReadFrequently: true });

/**
 * Rasterise `node` with its photo layers composited in. Returns null when there
 * is nothing to composite (no photo, or the photo can't be read) so the caller
 * can fall back to the straight capture.
 */
export const rasterizeWithPhotoComposite = async (
  node: HTMLElement,
  size: RasterSize,
  rasterize: Rasterize
): Promise<HTMLCanvasElement | null> => {
  const { layers, scale } = collectLayers(node, size);
  if (layers.length === 0) {
    return null;
  }
  // Each distinct photo loads once; independent loads run in parallel.
  const sources = [...new Set(layers.map((layer) => layer.draw.src))];
  const loaded = await Promise.all(sources.map(loadImage));
  const images = new Map<string, HTMLImageElement>(
    sources.map((src, index) => [src, loaded[index]])
  );
  const under = layers.filter((layer) => !layer.draw.foreground);
  const over = layers.filter((layer) => layer.draw.foreground);

  // The card without any cut-out: the photo layers under the theme's own.
  const base = await capturePair(layers, under, over, size, rasterize);
  const { black, white } = base;
  const blackCtx = readable(black);
  const whiteCtx = readable(white);
  if (!(blackCtx && whiteCtx)) {
    release(white);
    return black;
  }
  // Merge in horizontal bands: three full-size pixel buffers of a carousel
  // strip would be ~200MB, which is exactly the kind of allocation a phone
  // refuses. One band's worth of photo plane is enough at a time.
  const merged = mergeInBands(
    blackCtx,
    black,
    under,
    images,
    scale,
    (y, h, plane) =>
      mergeProbes(
        blackCtx.getImageData(0, y, black.width, h),
        whiteCtx.getImageData(0, y, black.width, h),
        plane
      )
  );
  release(white);
  if (!merged || over.length === 0) {
    return black;
  }

  // Then the cut-out over it (see the header): probes with its layer filled.
  const top = await capturePair(layers, over, [], size, rasterize);
  const a2 = readable(top.black);
  const b2 = readable(top.white);
  if (a2 && b2) {
    mergeInBands(blackCtx, black, over, images, scale, (y, h, plane) =>
      mergeForeground(
        blackCtx.getImageData(0, y, black.width, h),
        a2.getImageData(0, y, black.width, h),
        b2.getImageData(0, y, black.width, h),
        plane
      )
    );
  }
  release(top.black);
  release(top.white);
  return black;
};
