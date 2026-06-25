import type { ComponentProps } from "react";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import { NO_EFFECTS } from "@/lib/photo-effects";
import { EXPORT_FORMATS } from "@/theme/core/export-formats";
import { FormatProvider } from "@/theme/shared/format-context";
import { PhotoFxProvider } from "@/theme/shared/photo-fx";
import preview from "../../.storybook/preview";
import { Panorama } from "./panorama";

// Proof that <Panorama> un-hoards the photo. Three separate per-slide components,
// yet the photo spans seamlessly across the dashed seams, AND the "RIDGE"
// headline interweaves: a back panorama, then the headline, then the same
// panorama masked to the lower ground on top — so the headline tucks behind it.
// (The mask is a placeholder horizon gradient; real segmentation is a later
// feature — Panorama just accepts a `mask`.)

// A committed local asset so the proof always renders, with a clear horizon.
const PHOTO = "/images/dunes.webp";

// Visible below the horizon, transparent above — the masked "subject" copy.
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
              <Panorama index={i} total={total} />
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
              {/* subject: the same photo masked to the lower ground, on top */}
              <Panorama index={i} mask={SUBJECT_MASK} total={total} />
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
