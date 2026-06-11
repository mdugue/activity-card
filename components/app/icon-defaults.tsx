"use client";

// App-wide Phosphor icon defaults. Duotone is the editor's icon language —
// every hand-placed icon already passes `weight="duotone"`; providing it as
// the context default extends the same weight to the vendor `components/ui/`
// primitives (select carets, dialog closes, check marks) without editing
// vendor files. Per-icon `weight` props still override.

import { IconContext } from "@phosphor-icons/react";

const ICON_DEFAULTS = {
  color: "currentColor",
  size: "1em",
  weight: "duotone",
  mirrored: false,
} as const;

export function IconDefaults({ children }: { children: React.ReactNode }) {
  return (
    <IconContext.Provider value={ICON_DEFAULTS}>
      {children}
    </IconContext.Provider>
  );
}
