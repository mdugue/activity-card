"use client";

// Slide thumbnails — each is a *slice* of the one SeamlessCanvas (the same
// render the large preview and export use), so the strip, preview and output
// always agree. Click a thumbnail to bring it into the preview. The deck
// (chosen elsewhere) defines which slides exist; the strip is just navigation.

import { SeamlessCanvas } from "@/components/themes/carousel/seamless-canvas";
import { TEMPLATE_META } from "@/components/themes/carousel/templates";
import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { CarouselThemeId } from "@/lib/carousel/theme-tokens";
import type { Slide } from "@/lib/carousel/types";
import type { ColorScheme } from "@/lib/colors";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import type { StrataConfig } from "@/lib/strata";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/lib/visibility";

const THUMB_W = 92;
const THUMB_H = Math.round((THUMB_W * 1350) / 1080);
const SCALE = THUMB_W / 1080;

interface SlideStripProps {
  colors: ColorScheme;
  data: ActivityData;
  imageSize?: ImageSize | null;
  imageTransform?: ImageTransform | null;
  onSelect: (id: string) => void;
  photoEffects?: PhotoEffects;
  photoUrl?: string | null;
  selectedId: string | null;
  slides: Slide[];
  strataConfig?: StrataConfig;
  theme: CarouselThemeId;
  visibility?: Visibility;
}

export function SlideStrip(props: SlideStripProps) {
  const { slides, selectedId, onSelect } = props;

  // Each thumb renders the full strip and windows onto its own slice, so the
  // strip, large preview and export are guaranteed to show the same pixels.
  const canvas = (
    <SeamlessCanvas
      colors={props.colors}
      data={props.data}
      imageSize={props.imageSize}
      imageTransform={props.imageTransform}
      photoEffects={props.photoEffects}
      photoUrl={props.photoUrl}
      slides={slides}
      strataConfig={props.strataConfig}
      theme={props.theme}
      visibility={props.visibility}
    />
  );

  return (
    <div className="flex items-stretch justify-center gap-2">
      {slides.map((slide, i) => {
        const active = slide.id === selectedId;
        return (
          <div className="flex flex-col items-center gap-1" key={slide.id}>
            <button
              aria-label={`Slide ${i + 1}: ${TEMPLATE_META[slide.template].label}`}
              aria-pressed={active}
              className={cn(
                "relative overflow-hidden border-2 bg-white transition-all",
                active
                  ? "border-foreground shadow-md"
                  : "border-foreground/15 opacity-80 hover:opacity-100"
              )}
              onClick={() => onSelect(slide.id)}
              style={{ width: THUMB_W, height: THUMB_H }}
              type="button"
            >
              <div
                className="origin-top-left"
                style={{
                  width: 1080 * slides.length,
                  height: 1350,
                  transform: `translateX(${-(i * THUMB_W)}px) scale(${SCALE})`,
                }}
              >
                {canvas}
              </div>
            </button>
            <span className="font-medium font-mono text-[9px] opacity-50">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
