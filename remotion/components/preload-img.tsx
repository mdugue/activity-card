import { Img } from "remotion";

/**
 * Force-load an image the scene paints via CSS background (the app's photo
 * layers draw with background-image, which the renderer doesn't wait for).
 * Remotion's <Img> delays the frame until the bytes are in; the invisible
 * copy primes the browser cache so the CSS layer paints on the same frame.
 */
export function PreloadImg({ src }: { src: string }) {
  return (
    <Img
      src={src}
      style={{ height: 1, opacity: 0, position: "absolute", width: 1 }}
    />
  );
}
