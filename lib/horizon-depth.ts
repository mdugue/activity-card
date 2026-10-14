// "Text behind the horizon": split a photo at a depth so a theme can lay its
// headline between the far background and everything nearer.
//
// The depth map comes from Depth Anything V2 Small (Apache-2.0, run on the
// device by `lib/depth.worker.ts`), min–max normalised to 0–255 where HIGHER
// means NEARER. Everything at or nearer than the cut becomes the foreground
// layer; the rest (sky, far ridges) stays behind the text. Pure data in, pure
// data out — the canvas work lives in `hooks/use-photo-cutout.ts`.

/** The depth model: one-time download, cached by the browser afterwards. */
export const DEPTH_MODEL = {
  file: "onnx/model_quantized.onnx",
  id: "onnx-community/depth-anything-v2-small",
  /** download size of the weights, shown in the consent dialog */
  mb: 27,
} as const;

/** The transformers.js build the worker imports (pinned, Apache-2.0). */
export const TRANSFORMERS_URL =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1";

/** Cache transformers.js stores model files in (Cache API). */
export const MODEL_CACHE = "transformers-cache";

/** The weights' URL — the key the cache holds them under. */
export const depthModelUrl = (): string =>
  `https://huggingface.co/${DEPTH_MODEL.id}/resolve/main/${DEPTH_MODEL.file}`;

export interface DepthMap {
  /** normalised depth, row-major, 0 = farthest … 255 = nearest */
  data: Uint8Array;
  h: number;
  w: number;
}

/** Width of the soft edge around the cut, as a fraction of the depth range. */
const EDGE = 0.03;
/** Never cut so deep that the whole photo turns foreground. */
const MIN_CUT = 0.01;
/** Never cut so shallow that the headline only shows through sky. */
const MAX_SKY_CUT = 0.6;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * The default cut: only the sky stays behind. Takes the median depth of the
 * top 5% of rows (almost always sky in an outdoor photo) and cuts just in front
 * of it, so ridges and everything nearer come forward.
 */
export const skyCut = ({ data, w, h }: DepthMap): number => {
  const rows = Math.max(1, Math.round(h * 0.05));
  const top = data.slice(0, rows * w).toSorted((a, b) => a - b);
  if (top.length === 0) {
    return MIN_CUT;
  }
  const sky = top[Math.floor(top.length / 2)] / 255;
  return Math.min(MAX_SKY_CUT, sky + 0.04);
};

/**
 * The cut that puts the tapped point (u, v in 0–1 image coordinates) fully in
 * the foreground: everything as near as it, or nearer, comes forward. Reads the
 * median of a 3×3 neighbourhood so a tap on a thin edge doesn't pick noise.
 */
export const cutAt = (
  { data, w, h }: DepthMap,
  u: number,
  v: number
): number => {
  const cx = Math.round(clamp01(u) * (w - 1));
  const cy = Math.round(clamp01(v) * (h - 1));
  const samples: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = Math.min(w - 1, Math.max(0, cx + dx));
      const y = Math.min(h - 1, Math.max(0, cy + dy));
      samples.push(data[y * w + x]);
    }
  }
  samples.sort((a, b) => a - b);
  const picked = samples[Math.floor(samples.length / 2)] / 255;
  return Math.max(MIN_CUT, picked - EDGE);
};

/** Foreground coverage (0–255) of one depth sample for a cut. */
export const foregroundAlpha = (depth: number, cut: number): number =>
  Math.round(clamp01((depth / 255 - cut) / EDGE + 0.5) * 255);

/**
 * The cut as an RGBA mask the size of the depth map: white, with the
 * foreground coverage in the alpha channel. Scaled up onto the photo with
 * `destination-in` it keeps exactly the foreground pixels.
 */
export const foregroundMask = (
  map: DepthMap,
  cut: number
): Uint8ClampedArray<ArrayBuffer> => {
  const out = new Uint8ClampedArray(map.w * map.h * 4);
  // One lookup per depth level instead of the division per pixel.
  const lut = Array.from({ length: 256 }, (_, d) => foregroundAlpha(d, cut));
  for (let i = 0; i < map.data.length; i += 1) {
    const o = i * 4;
    out[o] = 255;
    out[o + 1] = 255;
    out[o + 2] = 255;
    out[o + 3] = lut[map.data[i]];
  }
  return out;
};
