// CSS colour filters (`grayscale(1) contrast(1.2) …`) as one colour matrix, for
// painting a photo exactly as the DOM filters it on a canvas that cannot
// (`CanvasRenderingContext2D.filter` is missing from older WebKit — the very
// engine the photo compositor exists for). Every colour filter function is an
// affine map of the RGB channels, so a whole chain folds into one 3×4 matrix
// plus an alpha factor; the matrices are the ones the Filter Effects spec
// defines. Functions that are not colour maps (blur, drop-shadow, url) make
// the chain unrepresentable and return null.

/** Row-major 3×4 affine map over RGB in 0…1 (`[r g b 1]` → each channel), plus
 *  a multiplier for alpha. */
export interface ColorMatrix {
  alpha: number;
  rgb: number[];
}

export const IDENTITY_MATRIX: ColorMatrix = {
  alpha: 1,
  rgb: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
};

/** The leading number of a filter argument (its unit follows). */
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/iu;

/** `0.5`, `50%` → 0.5; `30deg`, `0.5turn`, `1rad` → degrees for hue-rotate. */
const parseAmount = (raw: string, angle: boolean): number | null => {
  const value = raw.trim();
  const lead = NUMBER.exec(value)?.[0];
  const num = lead === undefined ? Number.NaN : Number(lead);
  if (!Number.isFinite(num)) {
    return null;
  }
  if (angle) {
    if (value.endsWith("turn")) {
      return num * 360;
    }
    if (value.endsWith("grad")) {
      return num * 0.9;
    }
    if (value.endsWith("rad")) {
      return (num * 180) / Math.PI;
    }
    return num;
  }
  return value.endsWith("%") ? num / 100 : num;
};

/** a ∘ b: apply `b` first, then `a`. */
const compose = (a: ColorMatrix, b: ColorMatrix): ColorMatrix => {
  const out: number[] = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      let v = c === 3 ? a.rgb[r * 4 + 3] : 0;
      for (let k = 0; k < 3; k += 1) {
        v += a.rgb[r * 4 + k] * b.rgb[k * 4 + c];
      }
      out.push(v);
    }
  }
  return { alpha: a.alpha * b.alpha, rgb: out };
};

const linear = (m: number[]): ColorMatrix => ({
  alpha: 1,
  rgb: [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0],
});

const perChannel = (scale: number, offset: number): ColorMatrix => ({
  alpha: 1,
  rgb: [scale, 0, 0, offset, 0, scale, 0, offset, 0, 0, scale, offset],
});

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const grayscale = (amount: number): ColorMatrix => {
  const g = 1 - clamp01(amount);
  return linear([
    0.2126 + 0.7874 * g,
    0.7152 - 0.7152 * g,
    0.0722 - 0.0722 * g,
    0.2126 - 0.2126 * g,
    0.7152 + 0.2848 * g,
    0.0722 - 0.0722 * g,
    0.2126 - 0.2126 * g,
    0.7152 - 0.7152 * g,
    0.0722 + 0.9278 * g,
  ]);
};

const sepia = (amount: number): ColorMatrix => {
  const s = 1 - clamp01(amount);
  return linear([
    0.393 + 0.607 * s,
    0.769 - 0.769 * s,
    0.189 - 0.189 * s,
    0.349 - 0.349 * s,
    0.686 + 0.314 * s,
    0.168 - 0.168 * s,
    0.272 - 0.272 * s,
    0.534 - 0.534 * s,
    0.131 + 0.869 * s,
  ]);
};

const saturate = (s: number): ColorMatrix =>
  linear([
    0.213 + 0.787 * s,
    0.715 - 0.715 * s,
    0.072 - 0.072 * s,
    0.213 - 0.213 * s,
    0.715 + 0.285 * s,
    0.072 - 0.072 * s,
    0.213 - 0.213 * s,
    0.715 - 0.715 * s,
    0.072 + 0.928 * s,
  ]);

const hueRotate = (deg: number): ColorMatrix => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return linear([
    0.213 + cos * 0.787 - sin * 0.213,
    0.715 - cos * 0.715 - sin * 0.715,
    0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143,
    0.715 + cos * 0.285 + sin * 0.14,
    0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787,
    0.715 - cos * 0.715 + sin * 0.715,
    0.072 + cos * 0.928 + sin * 0.072,
  ]);
};

/** One `name(arg)` filter function. */
const FUNCTION = /[a-z-]+\([^)]*\)/gu;

/** One filter function as a matrix, or null when it is not a colour map. */
const functionMatrix = (name: string, arg: string): ColorMatrix | null => {
  const angle = name === "hue-rotate";
  // An empty argument means "fully applied": 1, or no rotation at all.
  const fallback = angle ? 0 : 1;
  const amount = arg.trim() === "" ? fallback : parseAmount(arg, angle);
  if (amount === null) {
    return null;
  }
  switch (name) {
    case "grayscale": {
      return grayscale(amount);
    }
    case "sepia": {
      return sepia(amount);
    }
    case "saturate": {
      return saturate(amount);
    }
    case "hue-rotate": {
      return hueRotate(amount);
    }
    case "brightness": {
      return perChannel(amount, 0);
    }
    case "contrast": {
      return perChannel(amount, 0.5 - 0.5 * amount);
    }
    case "invert": {
      const i = clamp01(amount);
      return perChannel(1 - 2 * i, i);
    }
    case "opacity": {
      return { alpha: clamp01(amount), rgb: IDENTITY_MATRIX.rgb };
    }
    default: {
      return null;
    }
  }
};

/** Fold a CSS `filter` value into one colour matrix. `""` / `none` is the
 *  identity; anything that isn't purely colour functions is null. */
export const filterMatrix = (css: string): ColorMatrix | null => {
  const value = css.trim();
  if (value === "" || value === "none") {
    return IDENTITY_MATRIX;
  }
  let matrix = IDENTITY_MATRIX;
  let consumed = "";
  for (const match of value.matchAll(FUNCTION)) {
    const [call] = match;
    const open = call.indexOf("(");
    const step = functionMatrix(call.slice(0, open), call.slice(open + 1, -1));
    if (!step) {
      return null;
    }
    // Filter functions apply left to right.
    matrix = compose(step, matrix);
    consumed += match[0];
  }
  // Anything left over (a url(), a typo) means we don't understand the chain.
  return consumed.replaceAll(/\s/gu, "") === value.replaceAll(/\s/gu, "")
    ? matrix
    : null;
};

/** Apply a colour matrix to RGBA pixels in place (alpha is not premultiplied
 *  in ImageData, so RGB maps directly). */
export const applyColorMatrix = (data: Uint8ClampedArray, m: ColorMatrix) => {
  const [a, b, c, d, e, f, g, h, i, j, k, l] = m.rgb;
  const offR = d * 255;
  const offG = h * 255;
  const offB = l * 255;
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p];
    const gr = data[p + 1];
    const bl = data[p + 2];
    // Uint8ClampedArray rounds and clamps on write.
    data[p] = a * r + b * gr + c * bl + offR;
    data[p + 1] = e * r + f * gr + g * bl + offG;
    data[p + 2] = i * r + j * gr + k * bl + offB;
    if (m.alpha !== 1) {
      data[p + 3] *= m.alpha;
    }
  }
};
