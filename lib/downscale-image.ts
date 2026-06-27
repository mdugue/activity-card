// Generate a downscaled JPEG object URL for on-screen preview rendering. A raw
// phone photo is ~12 MP (~48 MB decoded); painting it full-res, CSS-filtered,
// across every wide carousel strip (editor preview, slide strip, the 7 export
// tiles) is what exhausts iOS Safari. The previews use this lighter proxy; the
// actual export still rasterises the original full-res file, so exported image
// quality is unchanged. Aspect is preserved exactly, so the same pan/zoom
// transform frames the proxy and the original identically.
//
// Returns null when the source is already within `maxEdge` (use the original
// directly) or on any failure (the caller falls back to the original URL).

const DEFAULT_MAX_EDGE = 1536;
const JPEG_QUALITY = 0.9;

export async function downscalePhoto(
  file: File,
  maxEdge: number = DEFAULT_MAX_EDGE
): Promise<string | null> {
  if (
    typeof document === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    return null;
  }
  try {
    // `from-image` applies the photo's EXIF orientation, matching how the
    // original is shown via CSS `background-image` — so the proxy can't end up
    // rotated differently from the export.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxEdge) {
      bitmap.close();
      return null; // already light enough — render the original directly
    }
    const scale = maxEdge / longest;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    // Release the canvas backing store promptly.
    canvas.width = 0;
    canvas.height = 0;
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
