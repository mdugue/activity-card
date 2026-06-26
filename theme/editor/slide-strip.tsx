"use client";

// Slide thumbnails — each is a *slice* of the one CarouselDeck (the same render
// the large preview and export use), so the strip, preview and output always
// agree. Click a thumbnail to bring it into the preview. The theme defines how
// many slides exist (its panel count); the strip is just navigation.

import type { ImageSize } from "@/hooks/use-image-natural-size";
import type { ActivityData } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";
import { cn } from "@/lib/utils";
import { CarouselDeck } from "@/theme/carousel/deck";
import type { CarouselTheme } from "@/theme/carousel/define-theme";
import type { ColorScheme } from "@/theme/core/colors";
import type { ExportFormat } from "@/theme/core/export-formats";
import type { Visibility } from "@/theme/core/visibility";

// Each thumbnail fits within this box — capping BOTH width and height so a tall
// format (9:16 Story) shrinks to a narrower mini instead of growing past the
// strip's height and clipping. Feed / square / landscape stay width-bound, so
// they're unchanged; only the taller-than-4:5 formats become height-bound.
const THUMB_MAX_W = 92;
const THUMB_MAX_H = 116;

interface SlideStripProps {
  colors: ColorScheme;
  config?: Record<string, unknown>;
  data: ActivityData;
  /** the active export format — sizes each thumbnail's aspect + slice */
  format: ExportFormat;
  imageSize?: ImageSize | null;
  imageTransform?: ImageTransform | null;
  onSelect: (index: number) => void;
  photoEffects?: PhotoEffects;
  photoUrl?: string | null;
  selectedIndex: number;
  theme: CarouselTheme;
  visibility?: Visibility;
}

export function SlideStrip(props: SlideStripProps) {
  const { selectedIndex, onSelect, theme, format } = props;
  const total = theme.panels.length;
  // Thumbnail aspect + slice scale follow the active format, fit-to-box so the
  // mini never exceeds the strip's height (1080×1350 → 92×115 at feed).
  const scale = Math.min(
    THUMB_MAX_W / format.width,
    THUMB_MAX_H / format.height
  );
  const thumbW = Math.round(format.width * scale);
  const thumbH = Math.round(format.height * scale);

  // Each thumb renders the full strip and windows onto its own slice, so the
  // strip, large preview and export are guaranteed to show the same pixels.
  const canvas = (
    <CarouselDeck
      colors={props.colors}
      config={props.config}
      data={props.data}
      format={format}
      imageSize={props.imageSize}
      imageTransform={props.imageTransform}
      photoEffects={props.photoEffects}
      photoUrl={props.photoUrl}
      theme={theme}
      visibility={props.visibility}
    />
  );

  return (
    <div className="flex items-stretch justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const active = i === selectedIndex;
        return (
          <div
            className="flex flex-col items-center gap-1"
            // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional — the index IS the identity (fixed count, never reordered)
            key={`slide-${i}`}
          >
            <button
              aria-label={`Slide ${i + 1}: ${theme.label}`}
              aria-pressed={active}
              className={cn(
                "relative overflow-hidden border-2 bg-white transition-all",
                active
                  ? "border-foreground shadow-md"
                  : "border-foreground/15 opacity-80 hover:opacity-100"
              )}
              onClick={() => onSelect(i)}
              style={{ width: thumbW, height: thumbH }}
              type="button"
            >
              <div
                className="origin-top-left"
                style={{
                  width: format.width * total,
                  height: format.height,
                  transform: `translateX(${-(i * thumbW)}px) scale(${scale})`,
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
