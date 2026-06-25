"use client";

// The export-format picker as a PREVIEW control: a compact dock trigger pinned
// beside the Export action (not one of the scrolling settings tabs, because the
// format is a preview concern, not a card setting). It opens a layer above the
// dock with the format list + the safe-zone guide toggle.

import { FrameCornersIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ToggleRow } from "@/components/app/control-primitives";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  type ExportFormat,
  type ExportFormatId,
  FORMAT_ORDER,
  getFormat,
} from "@/theme/core/export-formats";

interface FormatControlProps {
  format: ExportFormat;
  onFormatChange: (id: ExportFormatId) => void;
  /** safe-zone guide toggle — the single-card preview overlay. Omit it (and
   *  `showSafe`) and the toggle section is hidden, e.g. for the carousel. */
  onShowSafeChange?: (show: boolean) => void;
  /** which formats to offer — defaults to the full single-card `FORMAT_ORDER`;
   *  the carousel passes its gated `CAROUSEL_FORMAT_ORDER`. */
  order?: ExportFormatId[];
  showSafe?: boolean;
}

export function FormatControl({
  format,
  onFormatChange,
  showSafe = false,
  onShowSafeChange,
  order = FORMAT_ORDER,
}: FormatControlProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-label="Export format"
        className={cn(
          "flex h-auto w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-foreground/60 transition-colors hover:bg-foreground/5",
          "data-[popup-open]:bg-foreground/10 data-[popup-open]:text-foreground",
          "lg:w-auto lg:flex-row lg:gap-2 lg:px-4"
        )}
        data-testid="format-control"
        type="button"
      >
        <FrameCornersIcon aria-hidden className="size-5" weight="duotone" />
        <span className="font-mono font-semibold text-[9px] uppercase tracking-wide lg:text-[11px] lg:tracking-[0.14em]">
          {format.aspectLabel}
        </span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 gap-0 p-2" side="top">
        <div className="px-2 pt-1 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-55">
          Preview format
        </div>
        <div className="flex flex-col gap-0.5">
          {order.map((id) => {
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
                  <span className="truncate font-heading text-sm leading-tight tracking-tight">
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
          <div className="mt-2 border-foreground/10 border-t px-2 pt-3">
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
      </PopoverContent>
    </Popover>
  );
}
