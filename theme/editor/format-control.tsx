"use client";

// The export-format picker as a PREVIEW control: a compact dock trigger pinned
// beside the Export action (not one of the scrolling settings tabs, because the
// format is a preview concern, not a card setting). It opens a layer above the
// dock with the format list + the safe-zone guide toggle.

import { FrameCornersIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { ToggleRow } from "@/components/app/control-primitives";
import {
  DockPopoverContent,
  DockPopoverTrigger,
} from "@/components/app/primitives/dock";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FORMAT_ORDER, getFormat } from "@/theme/core/export-formats";
import type { ExportFormat, ExportFormatId } from "@/theme/core/export-formats";

interface FormatControlProps {
  format: ExportFormat;
  onFormatChange: (id: ExportFormatId) => void;
  /** safe-zone guide toggle; omit (with `showSafe`) to hide the toggle section */
  onShowSafeChange?: (show: boolean) => void;
  showSafe?: boolean;
}

export const FormatControl = ({
  format,
  onFormatChange,
  showSafe = false,
  onShowSafeChange,
}: FormatControlProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <DockPopoverTrigger
        aria-label="Export format"
        data-testid="format-control"
        type="button"
      >
        <FrameCornersIcon aria-hidden className="size-5" weight="duotone" />
        <span className="text-3xs lg:tracking-caps-sm font-mono font-semibold tracking-wide uppercase lg:text-xs">
          {format.aspectLabel}
        </span>
      </DockPopoverTrigger>

      <DockPopoverContent align="end" className="w-72" side="top">
        <div className="text-2xs tracking-caps-lg px-2 pt-1 pb-2 font-mono uppercase opacity-55">
          Preview format
        </div>
        <div className="flex flex-col gap-0.5">
          {FORMAT_ORDER.map((id) => {
            const f = getFormat(id);
            const active = id === format.id;
            return (
              <button
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-foreground/5"
                )}
                key={id}
                onClick={() => {
                  onFormatChange(id);
                  setOpen(false);
                }}
                type="button"
              >
                <FrameCornersIcon
                  aria-hidden
                  className="size-4 shrink-0"
                  weight="duotone"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-heading truncate text-sm leading-tight tracking-tight">
                    {f.label}
                  </span>
                  <span className="caption-micro">
                    {f.platform} · {f.aspectLabel}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {onShowSafeChange ? (
          <div className="border-foreground/10 mt-2 border-t px-2 pt-3">
            <ToggleRow
              checked={showSafe}
              label="Show safe zones"
              onCheckedChange={onShowSafeChange}
            />
            <p className="caption-micro mt-1.5 opacity-55">
              Same photo — platform-perfect crops &amp; safe areas.
            </p>
          </div>
        ) : null}
      </DockPopoverContent>
    </Popover>
  );
};
