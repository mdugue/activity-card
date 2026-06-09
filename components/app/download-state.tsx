"use client";

import {
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultFilename, exportCard } from "@/lib/export-card";
import { formatDateUpper } from "@/lib/format";
import type { ImageTransform } from "@/lib/image-transform";
import type { PaletteTheme } from "@/lib/palette";
import type { PhotoEffects } from "@/lib/photo-effects";
import { RenderTheme, type ThemeId } from "./render-theme";
import type { ActivityData } from "./sample-data";

const CONFETTI_COLORS = ["#c45a2c", "#1d3a2e", "#1a1714", "#a98352"];

interface DownloadStateProps {
  config: Record<string, unknown>;
  data: ActivityData;
  imageTransform: ImageTransform;
  onKeepEditing: () => void;
  onNew: () => void;
  /** Single-card backdrop toggle — must match the editor so the celebration
   *  thumbnail and the "Share" re-export agree with the downloaded PNG. */
  photoBackdropEnabled: boolean;
  photoEffects: PhotoEffects;
  photoPaletteTheme: PaletteTheme | null;
  photoUrl: string | null;
  theme: ThemeId;
}

export function DownloadState({
  data,
  theme,
  photoUrl,
  photoBackdropEnabled,
  config,
  photoEffects,
  photoPaletteTheme,
  imageTransform,
  onKeepEditing,
  onNew,
}: DownloadStateProps) {
  const filename = defaultFilename(data.sport, data.date);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current || isSharing) {
      return;
    }
    setIsSharing(true);
    try {
      await exportCard(cardRef.current, { filename });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center px-6 py-10">
      <Confetti />
      <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[auto_auto] lg:gap-20">
        <div className="relative justify-self-center">
          <div
            aria-hidden
            className="absolute inset-0 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.555 0.163 48.998 / 0.4), transparent 70%)",
            }}
          />
          <div className="relative aspect-[1080/1350] w-[240px] overflow-hidden bg-white shadow-2xl sm:w-[320px] lg:w-[450px]">
            <div className="absolute inset-0">
              <div
                className="origin-top-left scale-[0.222] sm:scale-[0.296] lg:scale-[0.4166]"
                style={{ width: 1080, height: 1350 }}
              >
                <RenderTheme
                  config={config}
                  data={data}
                  imageTransform={imageTransform}
                  photoBackdropEnabled={photoBackdropEnabled}
                  photoEffects={photoEffects}
                  photoPaletteTheme={photoPaletteTheme}
                  photoUrl={photoUrl}
                  theme={theme}
                />
              </div>
            </div>
          </div>
          <div className="absolute -right-3 -bottom-3 flex size-14 items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/50">
            <CheckIcon aria-hidden className="size-6" weight="bold" />
          </div>
        </div>

        <div className="max-w-md">
          <div className="font-mono font-semibold text-xs tracking-[0.32em] opacity-55">
            SAVED · {formatDateUpper(data.date)}
          </div>
          <h2 className="mt-4 font-heading text-7xl uppercase leading-[0.88] tracking-tight sm:text-8xl lg:text-9xl">
            THAT&apos;S
            <br />A <span className="text-primary">KEEPER.</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed opacity-75">
            Saved as{" "}
            <code className="bg-foreground px-2 py-1 font-medium font-mono text-background text-xs">
              {filename}
            </code>
            <br />
            1080 × 1350 — Instagram-ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button disabled={isSharing} onClick={handleShare} size="lg">
              <ShareNetworkIcon
                aria-hidden
                className="size-4"
                weight="duotone"
              />
              {isSharing ? "Sharing…" : "Share"}
            </Button>
            <Button onClick={onKeepEditing} size="lg" variant="outline">
              <PencilSimpleIcon
                aria-hidden
                className="size-4"
                weight="duotone"
              />
              Keep editing
            </Button>
            <Button onClick={onNew} size="lg" variant="ghost">
              <PlusIcon aria-hidden className="size-4" weight="duotone" />
              New
            </Button>
          </div>
        </div>
      </div>

      {/* Native-size mount used by html-to-image when re-sharing. Off-screen
          via translate but laid out at full 1080×1350 so the theme's flex
          columns reflow correctly inside the clone. Same trick as EditState. */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 -z-10"
        ref={cardRef}
        style={{ width: 1080, height: 1350, transform: "translateX(-200%)" }}
      >
        <RenderTheme
          config={config}
          data={data}
          imageTransform={imageTransform}
          photoBackdropEnabled={photoBackdropEnabled}
          photoEffects={photoEffects}
          photoPaletteTheme={photoPaletteTheme}
          photoUrl={photoUrl}
          theme={theme}
        />
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full">
      <title>celebration confetti</title>
      {Array.from({ length: 36 }, (_, i) => {
        const cx = ((i * 73 + 100) % 1400) / 1400;
        const cy = ((i * 113 + 180) % 800) / 800;
        const s = 4 + (i % 4) * 2;
        const c = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const rot = (i * 31) % 90;
        const k = `c-${i}-${c}-${s}-${rot}`;
        return (
          <rect
            fill={c}
            height={s}
            key={k}
            opacity={0.5}
            transform={`rotate(${rot})`}
            width={s}
            x={`${cx * 100}%`}
            y={`${cy * 100}%`}
          />
        );
      })}
    </svg>
  );
}
