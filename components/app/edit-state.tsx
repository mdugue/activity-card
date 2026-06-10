"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { SINGLE_CARD_THEMES, THEME_ORDER } from "@/components/themes/index";
import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultFilename, exportCard } from "@/lib/export-card";
import { useActivityTools } from "./activity-tools";
import { ControlDeck } from "./control-deck";
import type { EditorSession } from "./editor-session";
import { RenderTheme, type ThemeId } from "./render-theme";
import { SingleCardPreview } from "./single-card-preview";
import { ThemeRail } from "./theme-rail";

interface EditStateProps {
  onDownload: () => void;
  onThemeChange: (theme: ThemeId) => void;
  session: EditorSession;
  theme: ThemeId;
}

export function EditState({
  session,
  theme,
  onThemeChange,
  onDownload,
}: EditStateProps) {
  const { data, visibility, color, config, photo } = session;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      await exportCard(cardRef.current, {
        filename: defaultFilename(data.sport, data.date),
      });
      onDownload();
    } finally {
      setIsExporting(false);
    }
  };

  const tools = useActivityTools({
    mode: "single",
    session,
    themeControl: (
      <ThemeRail
        labels={SINGLE_CARD_THEMES}
        onThemeChange={onThemeChange}
        order={THEME_ORDER}
        theme={theme}
      />
    ),
  });

  return (
    <TooltipProvider delay={200}>
      <ControlDeck
        action={{
          icon: (
            <DownloadSimpleIcon
              aria-hidden
              className="size-5"
              weight="duotone"
            />
          ),
          isBusy: isExporting,
          label: "Download PNG",
          meta: "1080 × 1350",
          onAction: handleDownload,
        }}
        preview={
          <SingleCardPreview
            colors={color.scheme}
            config={config.value}
            data={data}
            imageTransform={photo.transform}
            onImageTransformChange={photo.onTransformChange}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoEffects={photo.effects}
            photoUrl={photo.url}
            theme={theme}
          />
        }
        tools={tools}
      >
        {/* Native-size mount used by html-to-image. Off-screen via translate
          (which html-to-image strips when capturing) but laid out at full
          1080×1350 so the flex columns reflow correctly inside the clone. */}
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 -z-10"
          ref={cardRef}
          style={{ width: 1080, height: 1350, transform: "translateX(-200%)" }}
        >
          <RenderTheme
            colors={color.scheme}
            config={config.value}
            data={data}
            imageTransform={photo.transform}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoEffects={photo.effects}
            photoUrl={photo.url}
            theme={theme}
          />
        </div>
      </ControlDeck>
    </TooltipProvider>
  );
}
