import type { ComponentProps } from "react";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { CarouselDeck } from "@/theme/carousel/deck";
import { CAROUSEL_FORMAT_ORDER } from "@/theme/carousel/geometry";
import {
  CAROUSEL_THEMES,
  type CarouselThemeId,
} from "@/theme/carousel/registry";
import { getFormat } from "@/theme/core/export-formats";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../.storybook/backgrounds";
import preview from "../../.storybook/preview";
import { activityArgType } from "../../.storybook/theme-controls";
import { carouselArgs } from "./story-support";

// One carousel theme across every format the carousel OFFERS (gated to
// CAROUSEL_FORMAT_ORDER — one per aspect bucket), each whole strip scaled into a
// tile. Proof the deck renders AT each target size with no Hybrid frame: the
// route/elevation canvases stay centred + aspect-true (they only receive a
// different w/h), and each panel keeps its content clear of that format's safe
// zone while the photo/canvas bleed underneath. Mirrors the single-card
// `withFormatMatrix`, but a carousel tile is a whole strip (count × slide), so
// it can't reuse that single-frame decorator. Toggle the Background toolbar to
// see it over a photo.
type MatrixArgs = ComponentProps<typeof CarouselDeck> & BackgroundArgs;

const TILE_W = 540;

function Matrix({
  themeId,
  args,
}: {
  args: MatrixArgs;
  themeId: CarouselThemeId;
}) {
  const descriptor = CAROUSEL_THEMES[themeId];
  const base = carouselArgs(themeId);
  const count = descriptor.panels.length;
  return (
    <div className="flex flex-1 flex-wrap content-start items-start gap-7 p-7">
      {CAROUSEL_FORMAT_ORDER.map((id) => {
        const f = getFormat(id);
        const stripW = count * f.width;
        const scale = TILE_W / stripW;
        return (
          <div className="flex flex-col gap-2" key={id}>
            <div
              className="relative overflow-hidden rounded-lg shadow-lg"
              style={{ width: stripW * scale, height: f.height * scale }}
            >
              <div
                style={{
                  width: stripW,
                  height: f.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <CarouselDeck
                  {...base}
                  data={args.data}
                  format={f}
                  imageSize={args.imageSize}
                  photoUrl={args.photoUrl}
                />
              </div>
            </div>
            <div className="font-mono text-xs tracking-wider opacity-70">
              {f.label} · {f.aspectLabel} · {count} slides
            </div>
          </div>
        );
      })}
    </div>
  );
}

const meta = preview.type<{ args: MatrixArgs }>().meta({
  component: CarouselDeck,
  title: "Carousel/Format matrix",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { data: activityArgType, ...backgroundArgTypes },
  args: { data: SAMPLE_RIDE, ...carouselArgs("trace") },
});

// The route-led art print across feed / square / story / landscape.
export const Trace = meta.story({
  render: (args) => <Matrix args={args} themeId="trace" />,
});

// Elevation-led — content anchored above the mountain range at every aspect.
export const Ascent = meta.story({
  args: { ...carouselArgs("ascent") },
  render: (args) => <Matrix args={args} themeId="ascent" />,
});

// Photo-led — the panorama bleeds across the strip; pick a Background to see it.
export const Exposure = meta.story({
  args: { ...carouselArgs("exposure") },
  render: (args) => <Matrix args={args} themeId="exposure" />,
});
