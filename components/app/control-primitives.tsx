"use client";

// Shared sidebar control primitives, used by both the Single Card and Carousel
// editors so the two sidebars are literally the same building blocks.

import { ImageSquareIcon } from "@phosphor-icons/react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** One row in a {@link RichSelect}: a glyph, a first-class value, and a calm
 * muted sidenote. `unit` rides next to the value (e.g. "1240" + "m"); `hint`
 * is the metric or discipline name shown under it. */
export interface RichSelectOption {
  hint?: string;
  icon: React.ReactNode;
  primary: string;
  unit?: string;
  value: string;
}

/** Shared visual for a rich option — used by both the trigger (the current
 * choice) and every item in the popup, so they read identically. */
function RichOptionContent({ option }: { option: RichSelectOption }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <span className="flex shrink-0 items-center text-foreground/75">
        {option.icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-baseline gap-1">
          <span className="truncate font-heading text-lg leading-tight tracking-tight">
            {option.primary}
          </span>
          {option.unit ? (
            <span className="shrink-0 font-medium font-mono text-muted-foreground text-xs">
              {option.unit}
            </span>
          ) : null}
        </span>
        {option.hint ? (
          <span className="caption-micro mt-0.5 truncate">{option.hint}</span>
        ) : null}
      </span>
    </span>
  );
}

/** A calm, icon-led select where the chosen value is set first-class on the
 * trigger (the actual number + unit, with the metric as a muted sidenote) and
 * every option mirrors it. Built on the base Select so keyboard + a11y come for
 * free; the trigger is a bordered tile to match the editor's toggle pickers. */
export function RichSelect({
  ariaLabel,
  className,
  onValueChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onValueChange: (value: string) => void;
  options: RichSelectOption[];
  value: string;
}) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  return (
    <Select
      onValueChange={(v) => {
        if (typeof v === "string") {
          onValueChange(v);
        }
      }}
      value={value}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "!h-auto w-full items-center gap-3 whitespace-normal border-input px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-foreground/35 data-[popup-open]:border-foreground data-[popup-open]:bg-muted/30",
          className
        )}
      >
        {selected ? <RichOptionContent option={selected} /> : null}
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem className="py-2.5" key={o.value} value={o.value}>
            <RichOptionContent option={o} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
  prominent,
}: {
  disabled?: boolean;
  onChange: (file: File | null) => void;
  photoUrl: string | null;
  /** big, inviting drop zone when no photo is set (the photo carries the card) */
  prominent?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = () => inputRef.current?.click();
  const fileInput = (
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
  );

  // Empty + supported → a large, inviting drop zone; the photo sets the mood.
  if (!photoUrl && prominent && !disabled) {
    return (
      <>
        {fileInput}
        <button
          className="mt-2 flex w-full flex-col items-center justify-center gap-2 border-2 border-foreground/25 border-dashed bg-muted/40 px-4 py-9 text-center transition-colors hover:border-foreground/55 hover:bg-muted/70"
          onClick={pick}
          type="button"
        >
          <ImageSquareIcon
            aria-hidden
            className="size-7 opacity-70"
            weight="duotone"
          />
          <span className="font-heading text-lg uppercase leading-none tracking-wide">
            Add a background photo
          </span>
          <span className="caption-micro">JPG or PNG · sets the mood</span>
        </button>
      </>
    );
  }

  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-3 border border-foreground/35 border-dashed p-3",
        disabled && "opacity-45"
      )}
    >
      {fileInput}
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
        onClick={pick}
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
