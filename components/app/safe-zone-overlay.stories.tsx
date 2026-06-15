import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import {
  type ExportFormatId,
  FORMAT_ORDER,
  getFormat,
} from "@/lib/export-formats";
import { SafeZoneOverlay } from "./safe-zone-overlay";

// Shows the keep-out guides for one format over a placeholder card, scaled into
// a fixed preview — the same overlay the editor preview and export sheet use.
const PREVIEW_W = 280;

function OverlayDemo({ formatId }: { formatId: ExportFormatId }) {
  const f = getFormat(formatId);
  const scale = PREVIEW_W / f.width;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 28, padding: 28 }}>
      <div
        style={{
          position: "relative",
          width: f.width * scale,
          height: f.height * scale,
          overflow: "hidden",
          background: "linear-gradient(135deg, #c45a2c 0%, #1d3a2e 100%)",
        }}
      >
        <SafeZoneOverlay format={f} scale={scale} />
      </div>
    </div>
  );
}

const meta = {
  component: OverlayDemo,
  tags: ["ai-generated"],
  parameters: { layout: "centered" },
  argTypes: {
    formatId: { control: "select", options: FORMAT_ORDER },
  },
  args: { formatId: "instagram-story" },
} satisfies Meta<ComponentProps<typeof OverlayDemo>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Story9x16: Story = { args: { formatId: "instagram-story" } };
export const Strava: Story = { args: { formatId: "strava" } };
export const TikTok: Story = { args: { formatId: "tiktok" } };
export const Square: Story = { args: { formatId: "square" } };
