"use client";

// The unified COLOUR control: one picker over both colour sources — the static
// preset schemes (singles or pairs) and, when a photo is loaded, the five
// photo-derived strategies (the old PhotoMood) shown with their real computed
// swatches and badged as coming from the photo. The selected choice resolves to
// a `ColorScheme` upstream; this control only edits the choice. Hidden entirely
// for themes whose palette is fixed (`userAdjustable: false`).

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ExtractedPalette } from "@/lib/palette";
import { cn } from "@/lib/utils";
import {
  colorChoiceId,
  PALETTE_VARIANTS,
  PRESET_SCHEMES,
  schemeFromPalette,
  VARIANT_LABELS,
} from "@/theme/core/colors";
import type { ColorChoice, ColorScheme } from "@/theme/core/colors";

/** A round swatch; pairs render as a two-hue split disc. */
function Swatch({ scheme }: { scheme: ColorScheme }) {
  const background = scheme.secondary
    ? `linear-gradient(135deg, ${scheme.primary} 0 50%, ${scheme.secondary} 50% 100%)`
    : scheme.primary;
  return (
    <span
      aria-hidden
      className="border-foreground/15 block size-8 rounded-full border"
      style={{ background }}
    />
  );
}

const SWATCH_ITEM_CLASSES = cn(
  "size-9 rounded-full border-2 border-transparent p-0 transition-transform outline-none",
  "ring-foreground ring-offset-background ring-offset-2",
  "data-[pressed]:scale-110 data-[pressed]:ring-2"
);

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

export function ColorControl({
  choice,
  isDefault,
  onChange,
  palette,
}: ColorControlProps) {
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
            className="mb-3 flex flex-wrap gap-2"
            onValueChange={pick(photoChoices)}
            spacing={2}
            value={[selectedId]}
          >
            {photoChoices.map((c) => {
              const variant = c.kind === "photo" ? c.variant : "vibrant";
              return (
                <ToggleGroupItem
                  aria-label={`${VARIANT_LABELS[variant]} — from your photo`}
                  className={cn(
                    SWATCH_ITEM_CLASSES,
                    "h-auto w-auto flex-col gap-1 rounded-md px-1.5 py-1.5"
                  )}
                  key={colorChoiceId(c)}
                  value={colorChoiceId(c)}
                >
                  <Swatch scheme={schemeFromPalette(palette, variant)} />
                  <span className="font-mono text-[8px] font-medium tracking-wide uppercase">
                    {VARIANT_LABELS[variant]}
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          aria-label="Preset colours"
          className="flex flex-wrap gap-2"
          onValueChange={pick(presetChoices)}
          spacing={2}
          value={[selectedId]}
        >
          {presetChoices.map((c) => (
            <ToggleGroupItem
              aria-label={`Colour ${c.kind === "preset" ? c.scheme.primary : ""}`}
              className={SWATCH_ITEM_CLASSES}
              key={colorChoiceId(c)}
              value={colorChoiceId(c)}
            >
              {c.kind === "preset" ? <Swatch scheme={c.scheme} /> : null}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          className="ml-auto"
          disabled={isDefault}
          onClick={() => onChange(null)}
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
}
