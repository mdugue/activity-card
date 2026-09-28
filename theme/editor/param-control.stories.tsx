import { useState } from "react";

import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { ALTITUDE_PARAMS } from "@/lib/altitude";
import type { ParamCtx, ParamDef } from "@/theme/core/params/kinds";

import preview from "../../.storybook/preview";
import { ParamControl } from "./param-control";

// The generic theme-parameter renderer. One `ParamControl` covers every kind a
// theme can declare; these stories exercise each in a small stateful harness.

const ctx: ParamCtx = { data: SAMPLE_RIDE, palette: null };

const Demo = ({ def, initial }: { def: ParamDef; initial: unknown }) => {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <div className="w-80 p-4">
      <ParamControl ctx={ctx} def={def} onChange={setValue} value={value} />
      <pre className="caption-micro mt-4 opacity-60">
        {JSON.stringify(value)}
      </pre>
    </div>
  );
};

const meta = preview.meta({
  parameters: { layout: "centered" },
  tags: ["ai-generated"],
  title: "app/ParamControl",
});

export const Toggle = meta.story(() => (
  <Demo
    def={{
      default: true,
      group: "marks",
      id: "legend",
      kind: "toggle",
      label: "Show legend",
    }}
    initial={true}
  />
));

export const Segmented = meta.story(() => (
  <Demo
    def={{
      default: "woven",
      group: "layout",
      id: "density",
      kind: "segmented",
      label: "DENSITY",
      options: [
        { blurb: "many layers", id: "fine", label: "Fine" },
        { blurb: "balanced", id: "woven", label: "Woven" },
        { blurb: "few ridges", id: "bold", label: "Bold" },
      ],
    }}
    initial="woven"
  />
));

export const Slider = meta.story(() => (
  <Demo
    def={{
      default: 20,
      group: "layout",
      id: "opacity",
      kind: "slider",
      label: "CUTOUT OPACITY",
      max: 100,
      min: 0,
      step: 1,
      unit: "%",
    }}
    initial={20}
  />
));

// The Altitude HEADLINE select, on the real param spec: every option leads
// with its duotone metric glyph (`ParamOption.glyph` → the icon map in
// param-control.tsx) and shows the live value first-class.
const headlineDef = ALTITUDE_PARAMS.find((p) => p.id === "claim");
if (!headlineDef) {
  throw new Error("ALTITUDE_PARAMS must declare the `claim` headline select");
}
export const SelectWithGlyphs = meta.story(() => (
  <Demo def={headlineDef} initial="elevation" />
));

// A select with live colour swatches — the pattern the Photo theme uses to show
// each palette strategy's real accent next to its name.
export const SelectWithSwatches = meta.story(() => (
  <Demo
    def={{
      default: "amber",
      group: "style",
      id: "palette",
      kind: "select",
      label: "COLOUR",
      options: [
        { hint: "warm", id: "amber", label: "Amber", swatch: "#e0823a" },
        { hint: "cool", id: "teal", label: "Teal", swatch: "#2f6f86" },
        { hint: "bold", id: "crimson", label: "Crimson", swatch: "#b1281a" },
      ],
    }}
    initial="amber"
  />
));
