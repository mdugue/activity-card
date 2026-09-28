"use client";

// The unified COLOUR control: one picker over both colour sources — the static
// preset schemes (singles or pairs) and, when a photo is loaded, the five
// photo-derived strategies (the old PhotoMood) shown with their real computed
// swatches and badged as coming from the photo. The selected choice resolves to
// a `ColorScheme` upstream; this control only edits the choice. Hidden entirely
// for themes whose palette is fixed (`userAdjustable: false`).

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";

import { SwatchToggleItem } from "@/components/app/primitives/toggle-group";
import { Button } from "@/components/ui/button";
import { ToggleGroup } from "@/components/ui/toggle-group";
import type { ExtractedPalette } from "@/lib/palette";
import {
  colorChoiceId,
  PALETTE_VARIANTS,
  PRESET_SCHEMES,
  schemeFromPalette,
  VARIANT_LABELS,
} from "@/theme/core/colors";
import type { ColorChoice, ColorScheme } from "@/theme/core/colors";

/** The scheme's hues, read by `bg-(image:--swatch)`. */
interface SwatchVars extends CSSProperties {
  "--swatch": string;
}

/** A round swatch; pairs render as a two-hue split disc. */
const Swatch = ({ scheme }: { scheme: ColorScheme }) => {
  // A single hue is a flat gradient, so both cases paint as one image.
  const swatchVars: SwatchVars = {
    "--swatch":
      scheme.secondary !== undefined && scheme.secondary !== ""
        ? `linear-gradient(135deg, ${scheme.primary} 0 50%, ${scheme.secondary} 50% 100%)`
        : `linear-gradient(${scheme.primary}, ${scheme.primary})`,
  };
  return (
    <span
      aria-hidden
      className="border-foreground/15 block size-8 rounded-full border bg-(image:--swatch)"
      style={swatchVars}
    />
  );
};

interface ColorControlProps {
  /** the effective choice (the theme's default until the user picks) */
  choice: ColorChoice;
  /** true while the user hasn't customised — disables Reset */
  isDefault: boolean;
  /** `null` resets to the theme's default choice */
  onChange: (choice: ColorChoice | null) => void;
  /** extracted photo palette — enables the photo-derived options */
  palette: ExtractedPalette | null;
}

export const ColorControl = ({
  choice,
  isDefault,
  onChange,
  palette,
}: ColorControlProps) => {
  const selectedId = colorChoiceId(choice);

  const pick = (choices: ColorChoice[]) => (values: string[]) => {
    const next = choices.find((c) => colorChoiceId(c) === values[0]);
    if (next) {
      onChange(next);
    }
  };

  const photoChoices: ColorChoice[] = PALETTE_VARIANTS.map((variant) => ({
    kind: "photo",
    variant,
  }));
  const presetChoices: ColorChoice[] = PRESET_SCHEMES.map((scheme) => ({
    kind: "preset",
    scheme,
  }));

  return (
    <div>
      <div className="caption-micro mt-4 mb-2">COLOUR</div>
      {palette ? (
        <>
          <div className="caption-micro text-primary mb-1.5">
            FROM YOUR PHOTO
          </div>
          <ToggleGroup
            aria-label="Colours from your photo"
            className="mb-3 flex flex-wrap"
            onValueChange={pick(photoChoices)}
            spacing={2}
            value={[selectedId]}
          >
            {photoChoices.map((c) => {
              const variant = c.kind === "photo" ? c.variant : "vibrant";
              return (
                <SwatchToggleItem
                  aria-label={`${VARIANT_LABELS[variant]} — from your photo`}
                  key={colorChoiceId(c)}
                  look="tile"
                  value={colorChoiceId(c)}
                >
                  <Swatch scheme={schemeFromPalette(palette, variant)} />
                  <span className="text-3xs font-mono font-medium tracking-wide uppercase">
                    {VARIANT_LABELS[variant]}
                  </span>
                </SwatchToggleItem>
              );
            })}
          </ToggleGroup>
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          aria-label="Preset colours"
          className="flex flex-wrap"
          onValueChange={pick(presetChoices)}
          spacing={2}
          value={[selectedId]}
        >
          {presetChoices.map((c) => (
            <SwatchToggleItem
              aria-label={`Colour ${c.kind === "preset" ? c.scheme.primary : ""}`}
              key={colorChoiceId(c)}
              value={colorChoiceId(c)}
            >
              {c.kind === "preset" ? <Swatch scheme={c.scheme} /> : null}
            </SwatchToggleItem>
          ))}
        </ToggleGroup>
        <Button
          className="ml-auto"
          disabled={isDefault}
          onClick={() => {
            onChange(null);
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ArrowCounterClockwiseIcon className="size-3.5" weight="duotone" />
          Reset
        </Button>
      </div>
    </div>
  );
};
