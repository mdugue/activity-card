// Renders a story once per export format — each at its true aspect, scaled into
// a fixed tile — and wraps every instance in that format's `FormatProvider`. The
// storied component reads its own dimensions + safe insets from that context
// (`useFormat` / `useSafeInsets`), so one decorator fans ANY format-aware theme
// across every platform at once: a raw theme component (which reads the context
// directly) or the `RenderTheme` dispatcher (whose `format` prop falls back to
// the surrounding context). Add it to a theme story with `decorators:
// [withFormatMatrix]`; every variant then renders across all formats.
//
// The `Safe zones` toolbar toggle overlays each tile with the same platform
// keep-out guides the app's editor/export sheet draw (`SafeZoneOverlay`).

import type { Decorator } from "@storybook/nextjs-vite";
import type { GlobalTypes } from "storybook/internal/types";
import { SafeZoneOverlay } from "@/components/app/safe-zone-overlay";
import { FormatProvider } from "@/components/themes/shared/format-context";
import { FORMAT_ORDER, getFormat } from "@/lib/export-formats";

const TILE_W = 400;
const TILE_H = 400;

export const DEFAULT_SAFE_ZONES = "off";

/** Toolbar toggle for the safe-zone overlay. Lives in `preview.tsx`'s
 *  `globalTypes`; read here from `context.globals`. */
export const safeZoneGlobalTypes = {
  safeZones: {
    name: "Safe zones",
    description: "Overlay each format's platform safe-zone guides",
    toolbar: {
      title: "Safe zones",
      icon: "ruler",
      dynamicTitle: true,
      items: [
        { value: "off", title: "Safe zones — off" },
        { value: "on", title: "Safe zones — on" },
      ],
    },
  },
} satisfies GlobalTypes;

export const withFormatMatrix: Decorator = (Story, context) => {
  const showSafe = context.globals.safeZones === "on";
  return (
    <div className="flex flex-1 flex-wrap content-start items-start gap-7 p-7">
      {FORMAT_ORDER.map((id) => {
        const f = getFormat(id);
        const scale = Math.min(TILE_W / f.width, TILE_H / f.height);
        return (
          <div className="flex flex-col gap-2" key={id}>
            <div
              className="relative overflow-hidden rounded-lg shadow-lg"
              style={{ width: f.width * scale, height: f.height * scale }}
            >
              <div
                style={{
                  width: f.width,
                  height: f.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <FormatProvider value={f}>
                  <Story />
                </FormatProvider>
              </div>
              {showSafe ? <SafeZoneOverlay format={f} scale={scale} /> : null}
            </div>
            <div className="font-mono text-xs tracking-wider opacity-70">
              {f.label} · {f.aspectLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
};
