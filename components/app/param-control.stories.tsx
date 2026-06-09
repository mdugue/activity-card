import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import type { ParamCtx, ParamDef } from "@/lib/params/kinds";
import { ParamControl } from "./param-control";

// The generic theme-parameter renderer. One `ParamControl` covers every kind a
// theme can declare; these stories exercise each in a small stateful harness.

const ctx: ParamCtx = { data: SAMPLE_RIDE, palette: null };

function Demo({ def, initial }: { def: ParamDef; initial: unknown }) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <div className="w-80 p-4">
      <ParamControl ctx={ctx} def={def} onChange={setValue} value={value} />
      <pre className="caption-micro mt-4 opacity-60">
        {JSON.stringify(value)}
      </pre>
    </div>
  );
}

const meta = {
  title: "app/ParamControl",
  tags: ["ai-generated"],
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
  render: () => (
    <Demo
      def={{
        id: "legend",
        group: "marks",
        label: "Show legend",
        kind: "toggle",
        default: true,
      }}
      initial={true}
    />
  ),
};

export const Segmented: Story = {
  render: () => (
    <Demo
      def={{
        id: "density",
        group: "layout",
        label: "DENSITY",
        kind: "segmented",
        default: "woven",
        options: [
          { id: "fine", label: "Fine", blurb: "many layers" },
          { id: "woven", label: "Woven", blurb: "balanced" },
          { id: "bold", label: "Bold", blurb: "few ridges" },
        ],
      }}
      initial="woven"
    />
  ),
};

export const Slider: Story = {
  render: () => (
    <Demo
      def={{
        id: "opacity",
        group: "layout",
        label: "CUTOUT OPACITY",
        kind: "slider",
        default: 20,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
      }}
      initial={20}
    />
  ),
};

// A select with live colour swatches — the pattern the Photo theme uses to show
// each palette strategy's real accent next to its name.
export const SelectWithSwatches: Story = {
  render: () => (
    <Demo
      def={{
        id: "palette",
        group: "style",
        label: "COLOUR",
        kind: "select",
        default: "amber",
        options: [
          { id: "amber", label: "Amber", hint: "warm", swatch: "#e0823a" },
          { id: "teal", label: "Teal", hint: "cool", swatch: "#2f6f86" },
          { id: "crimson", label: "Crimson", hint: "bold", swatch: "#b1281a" },
        ],
      }}
      initial="amber"
    />
  ),
};
