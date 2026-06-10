import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { ColorChoice } from "@/lib/colors";
import type { ExtractedPalette, PaletteTheme } from "@/lib/palette";
import { ColorControl } from "./color-control";

// The unified COLOUR control: static preset schemes (singles + pairs) and —
// when a photo palette is available — the five photo-derived strategies with
// their real computed swatches under a FROM YOUR PHOTO heading.

function paletteTheme(accent: string, accent2: string): PaletteTheme {
  return {
    variant: "vibrant",
    accent,
    accent2,
    background: "#16120e",
    body: "rgba(243,237,226,0.7)",
    headline: "#f3ede2",
    onAccent: "#16120e",
  };
}

const MOCK_PALETTE: ExtractedPalette = {
  swatches: [],
  themes: {
    vibrant: paletteTheme("#e0683a", "#caa46a"),
    muted: paletteTheme("#a98352", "#8a6f4e"),
    complementary: paletteTheme("#2f6f86", "#c4663a"),
    spectrum: paletteTheme("#b1281a", "#1d3a2e"),
    pure: paletteTheme("#ffffff", "#ffffff"),
  },
};

function Demo({ palette }: { palette: ExtractedPalette | null }) {
  const [choice, setChoice] = useState<ColorChoice | null>(null);
  const effective: ColorChoice = choice ?? {
    kind: "preset",
    scheme: { primary: "#c45a2c" },
  };
  return (
    <div className="w-96 p-4">
      <ColorControl
        choice={effective}
        isDefault={choice === null}
        onChange={setChoice}
        palette={palette}
      />
      <pre className="caption-micro mt-4 opacity-60">
        {JSON.stringify(choice)}
      </pre>
    </div>
  );
}

const meta = {
  title: "app/ColorControl",
  tags: ["ai-generated"],
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** No photo loaded: presets only. */
export const PresetsOnly: Story = {
  render: () => <Demo palette={null} />,
};

/** Photo loaded: the five photo-derived schemes lead, badged + with live
 *  swatches; the presets follow. */
export const WithPhotoPalette: Story = {
  render: () => <Demo palette={MOCK_PALETTE} />,
};
