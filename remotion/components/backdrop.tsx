import { AbsoluteFill, Img } from "remotion";
import { GRAIN_BG } from "@/lib/photo-effects";
import { INK, PAPER } from "../design/tokens";

/**
 * Scene background: the warm ink stage, warm paper, or a full-bleed photo
 * under an ink scrim. Grain reuses the app's export-safe tile (GRAIN_BG), so
 * video grain and card grain are literally the same texture.
 */
export function Backdrop({
  dim = 0.55,
  grain = false,
  photoSrc,
  variant = "ink",
  vignette = true,
}: {
  /** how much ink to lay over a photo (0–1) */
  dim?: number;
  grain?: boolean;
  /** required when variant is "photo" — pass `staticFile(...)` */
  photoSrc?: string;
  variant?: "ink" | "paper" | "photo";
  vignette?: boolean;
}) {
  return (
    <AbsoluteFill
      style={{ backgroundColor: variant === "paper" ? PAPER : INK }}
    >
      {variant === "photo" && photoSrc ? (
        <>
          <Img
            src={photoSrc}
            style={{ height: "100%", objectFit: "cover", width: "100%" }}
          />
          <AbsoluteFill
            style={{
              backgroundColor: INK,
              opacity: dim,
            }}
          />
        </>
      ) : null}
      {grain ? (
        <AbsoluteFill
          style={{
            backgroundImage: GRAIN_BG,
            backgroundRepeat: "repeat",
            mixBlendMode: "overlay",
            opacity: 0.5,
          }}
        />
      ) : null}
      {vignette ? (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.32) 100%)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}
