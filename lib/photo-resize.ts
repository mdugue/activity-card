// Cap a background photo to what the export can actually use.
//
// The biggest card Effort writes is 1080×1920 at 2× — 2160×3840 pixels — so
// anything beyond ~3840 on the long edge is detail no export can show. It is
// not free, though: every extra megapixel is decoded twice on export (once for
// the preview, once inside the rasterised snapshot), and mobile Safari is
// strict about image and canvas memory — it drops a decode it can't afford
// without raising an error, which reads as "the background didn't export".
// Strava serves renditions up to 5000px (≈19 MP, ~75 MB decoded), so a photo
// picked from Strava on a phone is exactly the case that used to fall over.
//
// Downscaling on the way in keeps the preview, the palette extraction and the
// export all working on a photo the device can hold.

/** Longest edge we keep — the tallest export (1080×1920 at 2×) is 3840px. */
export const MAX_PHOTO_EDGE = 3840;
/** …and a ceiling on total pixels, so a square photo can't reach 15 MP. */
export const MAX_PHOTO_PIXELS = 12_000_000;

export interface PhotoSize {
  h: number;
  w: number;
}

/**
 * The size to decode a photo at: unchanged when it already fits, otherwise
 * scaled down (aspect preserved) until both limits hold.
 */
export function cappedPhotoSize(
  w: number,
  h: number,
  maxEdge = MAX_PHOTO_EDGE,
  maxPixels = MAX_PHOTO_PIXELS
): PhotoSize {
  if (!(w > 0 && h > 0)) {
    return { w, h };
  }
  const scale = Math.min(
    1,
    maxEdge / Math.max(w, h),
    Math.sqrt(maxPixels / (w * h))
  );
  if (scale >= 1) {
    return { w, h };
  }
  return {
    w: Math.max(1, Math.round(w * scale)),
    h: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * Re-encode `file` at the capped size. Returns the original file when it
 * already fits — and when anything goes wrong, since a photo the device can
 * *probably* handle beats no photo at all.
 */
export async function capPhotoResolution(file: File): Promise<File> {
  if (
    typeof document === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    return file;
  }
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const size = cappedPhotoSize(bitmap.width, bitmap.height);
    if (size.w === bitmap.width && size.h === bitmap.height) {
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.w, size.h);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) {
      return file;
    }
    return new File([blob], `${file.name.replace(/\.[^.]+$/u, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
