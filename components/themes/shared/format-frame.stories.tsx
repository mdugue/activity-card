import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { RenderTheme, type ThemeId } from "@/components/app/render-theme";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { FORMAT_ORDER, getFormat } from "@/lib/export-formats";
import {
  type BackgroundArgs,
  backgroundArgTypes,
} from "../../../.storybook/backgrounds";

// Renders one theme across every export format through the Hybrid frame, so the
// two-pass layout (full-bleed back + safe-zone front) can be eyeballed at once.
// Add a Background photo (toolbar or per-story upload) to see the bleed.
const TILE_W = 220;
const TILE_H = 300;

function FormatMatrix({
  theme,
  photoUrl,
}: {
  photoUrl?: string;
  theme: ThemeId;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 28,
        padding: 28,
        alignItems: "flex-start",
        background: "#f1ece4",
        minHeight: "100vh",
      }}
    >
      {FORMAT_ORDER.map((id) => {
        const f = getFormat(id);
        const scale = Math.min(TILE_W / f.width, TILE_H / f.height);
        return (
          <div
            key={id}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div
              style={{
                width: f.width * scale,
                height: f.height * scale,
                overflow: "hidden",
                borderRadius: 6,
                boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  width: f.width,
                  height: f.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <RenderTheme
                  data={SAMPLE_RIDE}
                  format={f}
                  photoBackdropEnabled
                  photoUrl={photoUrl}
                  theme={theme}
                />
              </div>
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.08em",
                opacity: 0.7,
              }}
            >
              {f.label} · {f.aspectLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const meta = {
  component: FormatMatrix,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },
  args: { theme: "altitude" },
} satisfies Meta<ComponentProps<typeof FormatMatrix> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Photo-led themes bleed the photo + elevation; the claim/stats stay safe.
export const Altitude: Story = {};
export const Photo: Story = { args: { theme: "photo" } };
// Poster themes ride the "front" layer as a contained card on their own matte.
export const Path: Story = { args: { theme: "path" } };
export const Data: Story = { args: { theme: "data" } };
