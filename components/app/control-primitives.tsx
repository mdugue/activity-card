"use client";

// Shared sidebar control primitives, used by both the Single Card and Carousel
// editors so the two sidebars are literally the same building blocks.

import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ControlBlock({
  label,
  children,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <div className="caption-label">{label}</div>
      {children}
    </div>
  );
}

export function DetailField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
  disabledReason,
  toggle,
}: {
  disabled?: boolean;
  disabledReason?: string;
  hint?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  toggle?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  value: string;
}) {
  const labelEl = (
    <Label
      className="font-medium font-mono text-[11px] uppercase tracking-[0.22em] opacity-65"
      htmlFor={id}
    >
      {label}
    </Label>
  );
  return (
    <div className={disabled ? "opacity-45" : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          {disabled && disabledReason ? (
            <Tooltip>
              <TooltipTrigger render={<span>{labelEl}</span>} />
              <TooltipContent>{disabledReason}</TooltipContent>
            </Tooltip>
          ) : (
            labelEl
          )}
          {hint ? (
            <span className="font-medium font-mono text-[9px] uppercase tracking-[0.18em] opacity-50">
              {hint}
            </span>
          ) : null}
        </div>
        {toggle ? (
          <Switch
            aria-label={`Show ${label.toLowerCase()} on card`}
            checked={toggle.checked}
            disabled={disabled}
            onCheckedChange={toggle.onChange}
          />
        ) : null}
      </div>
      <Input
        className="mt-1 h-auto border-0 border-foreground border-b-2 px-0 py-1.5 font-heading text-lg tracking-tight focus-visible:ring-0"
        disabled={disabled}
        id={id}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

export function PhotoControl({
  photoUrl,
  onChange,
  disabled,
}: {
  disabled?: boolean;
  onChange: (file: File | null) => void;
  photoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-3 border border-foreground/35 border-dashed p-3",
        disabled && "opacity-45"
      )}
    >
      <input
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onChange(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      <div
        aria-hidden
        className="size-12"
        style={{
          background: photoUrl
            ? `url(${photoUrl}) center/cover`
            : "linear-gradient(135deg, #d8c5a0, #4a2a18)",
        }}
      />
      <div className="flex-1 font-medium font-mono text-xs opacity-70">
        {photoUrl ? "Photo loaded" : "NO PHOTO · TAP TO ADD"}
      </div>
      {photoUrl ? (
        <Button
          disabled={disabled}
          onClick={() => onChange(null)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      ) : null}
      <Button
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        size="sm"
        variant={photoUrl ? "ghost" : "default"}
      >
        {photoUrl ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
  disabledReason,
}: {
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const labelEl = (
    <Label
      className={cn("font-medium text-sm", disabled && "opacity-50")}
      htmlFor={id}
    >
      {label}
    </Label>
  );
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        disabled && "opacity-60"
      )}
    >
      {disabled && disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span>{labelEl}</span>} />
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        labelEl
      )}
      <Switch
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
