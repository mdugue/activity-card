"use client";

import { ShareNetworkIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { SINGLE_CARD_THEMES, THEME_ORDER } from "@/components/themes/index";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ExportFormat, ExportFormatId } from "@/lib/export-formats";
import { useActivityTools } from "./activity-tools";
import { ControlDeck } from "./control-deck";
import type { EditorSession } from "./editor-session";
import type { ThemeId } from "./render-theme";
import { SingleCardPreview } from "./single-card-preview";
import { ThemeRail } from "./theme-rail";

interface EditStateProps {
  /** the format previewed in the stage (the export sheet still offers all) */
  format: ExportFormat;
  /** opens the export sheet (where the per-format downloads happen) */
  onExport: () => void;
  onFormatChange: (id: ExportFormatId) => void;
  onThemeChange: (theme: ThemeId) => void;
  session: EditorSession;
  theme: ThemeId;
}

export function EditState({
  session,
  theme,
  format,
  onFormatChange,
  onThemeChange,
  onExport,
}: EditStateProps) {
  const { data, visibility, color, config, photo } = session;
  // The safe-zone guide is an editor-only preview overlay; the FORMAT tool
  // toggles it and the preview reads it.
  const [showSafe, setShowSafe] = useState(false);

  const tools = useActivityTools({
    mode: "single",
    session,
    format,
    onFormatChange,
    showSafe,
    onShowSafeChange: setShowSafe,
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
            <ShareNetworkIcon aria-hidden className="size-5" weight="duotone" />
          ),
          isBusy: false,
          label: "Export",
          meta: "7 formats",
          onAction: onExport,
        }}
        preview={
          <SingleCardPreview
            colors={color.scheme}
            config={config.value}
            data={data}
            format={format}
            imageTransform={photo.transform}
            onImageTransformChange={photo.onTransformChange}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoEffects={photo.effects}
            photoUrl={photo.url}
            showSafe={showSafe}
            theme={theme}
          />
        }
        tools={tools}
      />
    </TooltipProvider>
  );
}
