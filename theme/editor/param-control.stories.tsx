import { useState } from "react";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { ALTITUDE_PARAMS } from "@/lib/altitude";
import type { ParamCtx, ParamDef } from "@/theme/core/params/kinds";
import preview from "../../.storybook/preview";
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

const meta = preview.meta({
  title: "app/ParamControl",
  tags: ["ai-generated"],
  parameters: { layout: "centered" },
});

export const Toggle = meta.story(() => (
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
));

export const Segmented = meta.story(() => (
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
));

export const Slider = meta.story(() => (
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
));
