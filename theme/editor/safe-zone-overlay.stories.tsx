import type { CSSProperties } from "react";

import { FORMAT_ORDER, getFormat } from "@/theme/core/export-formats";
import type { ExportFormatId } from "@/theme/core/export-formats";

import preview from "../../.storybook/preview";
import { SafeZoneOverlay } from "./safe-zone-overlay";

// Shows the keep-out guides for one format over a placeholder card, scaled into
// a fixed preview — the same overlay the editor preview and export sheet use.
const PREVIEW_W = 280;

/** The scaled placeholder card size, as CSS custom properties. */
interface PreviewStyle extends CSSProperties {
  "--preview-h": string;
  "--preview-w": string;
}

const OverlayDemo = ({ formatId }: { formatId: ExportFormatId }) => {
  const f = getFormat(formatId);
  const scale = PREVIEW_W / f.width;
  const style: PreviewStyle = {
    "--preview-h": `${f.height * scale}px`,
    "--preview-w": `${f.width * scale}px`,
  };
  return (
    <div className="flex flex-wrap gap-7 p-7">
      <div
        className="from-primary to-foreground relative h-(--preview-h) w-(--preview-w) overflow-hidden bg-linear-135"
        style={style}
      >
        <SafeZoneOverlay format={f} scale={scale} />
      </div>
    </div>
  );
};

const meta = preview.meta({
  argTypes: {
    formatId: { control: "select", options: FORMAT_ORDER },
  },
  args: { formatId: "instagram-story" },
  component: OverlayDemo,
  parameters: { layout: "centered" },
  tags: ["ai-generated"],
});

export const Story9x16 = meta.story({ args: { formatId: "instagram-story" } });
export const Strava = meta.story({ args: { formatId: "strava" } });
export const TikTok = meta.story({ args: { formatId: "tiktok" } });
export const Square = meta.story({ args: { formatId: "square" } });
