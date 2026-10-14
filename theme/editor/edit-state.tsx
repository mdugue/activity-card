"use client";

import { ShareNetworkIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { ControlDeck } from "@/components/app/control-deck";
import { CutoutConsentDialog } from "@/components/app/cutout-consent-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ExportFormat, ExportFormatId } from "@/theme/core/export-formats";
import { BEHIND_HORIZON } from "@/theme/core/horizon";
import { SINGLE_CARD_THEMES, THEME_ORDER } from "@/theme/single-card";

import { useActivityTools } from "./activity-tools";
import type { EditorSession } from "./editor-session";
import { FormatControl } from "./format-control";
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

export const EditState = ({
  session,
  theme,
  format,
  onFormatChange,
  onThemeChange,
  onExport,
}: EditStateProps) => {
  const { data, visibility, color, config, photo } = session;
  const { onTransformChange: handlePhotoTransformChange } = photo;
  const { confirm: handleCutoutConfirm } = photo.cutout;
  const { onChange: handleConfigChange } = config;
  // The safe-zone guide is an editor-only preview overlay; the FORMAT control
  // toggles it and the preview reads it.
  const [showSafe, setShowSafe] = useState(false);

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
            <ShareNetworkIcon aria-hidden className="size-5" weight="duotone" />
          ),
          label: "Export",
          meta: "7 formats",
          onAction: onExport,
        }}
        preview={
          <SingleCardPreview
            colors={color.scheme}
            config={config.value}
            cutout={photo.cutout}
            data={data}
            format={format}
            imageTransform={photo.transform}
            onImageTransformChange={handlePhotoTransformChange}
            photoBackdropEnabled={visibility.photoBackdrop}
            photoEffects={photo.effects}
            photoUrl={photo.url}
            showSafe={showSafe}
            theme={theme}
          />
        }
        previewControl={
          <FormatControl
            format={format}
            onFormatChange={onFormatChange}
            onShowSafeChange={setShowSafe}
            showSafe={showSafe}
          />
        }
        tools={tools}
      />
      {/* Asked once, before "text behind the horizon" downloads its model;
          declining turns the switch back off. */}
      <CutoutConsentDialog
        onConfirm={handleCutoutConfirm}
        onDecline={() => {
          handleConfigChange({ ...config.value, [BEHIND_HORIZON]: false });
        }}
        open={photo.cutout.status === "consent"}
      />
    </TooltipProvider>
  );
};
