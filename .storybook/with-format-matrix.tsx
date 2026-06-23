// Renders a story once per export format — each at its true aspect, scaled into
// a fixed tile — and wraps every instance in that format's `FormatProvider`. The
// storied component reads its own dimensions + safe insets from that context
// (`useFormat` / `useSafeInsets`), so one decorator fans ANY format-aware theme
// across every platform at once: a raw theme component (which reads the context
// directly) or the `RenderTheme` dispatcher (whose `format` prop falls back to
// the surrounding context). Add it to a theme story with `decorators:
// [withFormatMatrix]`; every variant then renders across all formats.

import type { Decorator } from "@storybook/nextjs-vite";
import { FormatProvider } from "@/components/themes/shared/format-context";
import { FORMAT_ORDER, getFormat } from "@/lib/export-formats";

const TILE_W = 200;
const TILE_H = 280;

export const withFormatMatrix: Decorator = (Story) => (
  <div className="flex flex-1 flex-wrap content-start items-start gap-7 p-7">
    {FORMAT_ORDER.map((id) => {
      const f = getFormat(id);
      const scale = Math.min(TILE_W / f.width, TILE_H / f.height);
      return (
        <div className="flex flex-col gap-2" key={id}>
          <div
            className="overflow-hidden rounded-lg shadow-lg"
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
          </div>
          <div className="font-mono text-xs tracking-wider opacity-70">
            {f.label} · {f.aspectLabel}
          </div>
        </div>
      );
    })}
  </div>
);
