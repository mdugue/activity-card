import type { ComponentProps } from "react";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import { NO_EFFECTS } from "@/lib/photo-effects";
import { EXPORT_FORMATS } from "@/theme/core/export-formats";
import { FormatProvider } from "@/theme/shared/format-context";
import { PhotoFxProvider } from "@/theme/shared/photo-fx";
import preview from "../../.storybook/preview";
import { Panorama } from "./panorama";

// Proof that <Panorama> un-hoards the photo. Three adjacent slides, each a
// SEPARATE component, yet:
//   1. the photo spans the strip seamlessly — every slide positions the same
//      image in strip coordinates, so it continues unbroken across the dashed
//      seams (drag the seam: the ridge line never jumps);
//   2. content INTERWEAVES — each slide draws `<Panorama layer="back" />`, then
//      the "RIDGE" headline, then `<Panorama layer="subject" mask=… />` ON TOP,
//      so the headline tucks BEHIND the masked lower "ground" while staying in
//      front of the sky. The fg/bg split is the one source drawn twice with two
//      masks, both in strip coords — impossible when the deck hoards one flat
//      layer under everything.
// (The mask here is a placeholder horizon gradient; real subject segmentation is
// a later feature — Panorama only needs to accept a `mask`/`layer`.)

// A committed local asset (served from `public/`) so the proof always renders —
// no network dependency, and its clear horizon suits the subject-mask demo.
const PHOTO = "/images/dunes.webp";

// Opaque (visible) below the horizon, transparent (hidden) above it — so the
// "subject" copy reveals only the lower ground that the headline tucks behind.
const SUBJECT_MASK =
  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 44%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 100%)";

function PanoramaProof({ photoUrl }: { photoUrl: string }) {
  const imageSize = useImageNaturalSize(photoUrl);
  const total = 3;
  const feed = EXPORT_FORMATS["instagram-feed"];
  return (
    <FormatProvider value={feed}>
      <PhotoFxProvider
        value={{
          effects: NO_EFFECTS,
          imageSize,
          imageTransform: null,
          photoUrl,
        }}
      >
        <div style={{ display: "flex", background: "#111" }}>
          {Array.from({ length: total }, (_, i) => (
            <div
              key={`slide-${i}`}
              style={{
                position: "relative",
                flex: "0 0 auto",
                width: feed.width,
                height: feed.height,
                overflow: "hidden",
                outline: "2px dashed rgba(255,90,90,0.8)",
                outlineOffset: -1,
              }}
            >
              {/* back: the seamless spanning photo */}
              <Panorama index={i} layer="back" total={total} />
              {/* content, between the two photo layers */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 300,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    color: "#fff",
                    textShadow: "0 6px 40px rgba(0,0,0,0.55)",
                  }}
                >
                  RIDGE
                </span>
              </div>
              {/* subject: the SAME photo, masked to the lower ground, on top —
                  so the headline tucks behind it */}
              <Panorama
                index={i}
                layer="subject"
                mask={SUBJECT_MASK}
                total={total}
              />
            </div>
          ))}
        </div>
      </PhotoFxProvider>
    </FormatProvider>
  );
}

const meta = preview
  .type<{ args: ComponentProps<typeof PanoramaProof> }>()
  .meta({
    component: PanoramaProof,
    title: "Carousel/Panorama (un-hoarded photo)",
    tags: ["ai-generated"],
    parameters: { layout: "fullscreen" },
    args: { photoUrl: PHOTO },
    render: (args) => <PanoramaProof {...args} />,
  });

// The headline interwoven between a back panorama and a masked subject panorama,
// across three seamless slides.
export const Interwoven = meta.story({});
