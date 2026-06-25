---
name: format-aware-themes
description: Single-card themes are now format-aware (render directly at the target export size); the FormatFrame/Hybrid approach was removed
metadata:
  type: project
---

On 2026-06-16 the single-card render pipeline was migrated from the external
`FormatFrame` ("Hybrid frame", scale-the-intact-1080×1350-card approach) to
**format-aware themes**: every theme renders directly at the active export
dimensions and reads them + the platform safe insets from a `FormatContext`
(`components/themes/shared/format-context.tsx`: `useFormat`, `useSafeInsets`,
`FullBleed`, `SafeArea`).

**Why:** the old frame treated the theme as one opaque scaled block, so the
theme wasn't the single source of truth, photo handling leaked into the frame,
safe zones were advisory-only (the `safe` insets weren't consumed by layout —
only by the overlay guide), and a single element couldn't mask across the
full-bleed and safe coordinate systems (e.g. Altitude's claim sliced by the
elevation curve). User explicitly chose to migrate **all** themes, not keep a
scale-to-fit fallback.

**The contract:** per-side inset = `mergeSafe(format.safe, naturalMargin)` =
`max(theme's own 4:5 margin, platform safe inset)` (`lib/export-formats.ts`).
At the 4:5 feed master the theme's own margins win, so 6/7 themes are
pixel-identical to legacy. Removed: `FormatFrame`, `frameFit`, `ThemeSurface`/
`surface` prop, `ThemeFramePolicy`/`frame` descriptor field.

**How to apply / follow-ups still open:**
- The one accepted deviation: Strata's stat strip sat flush to the bottom edge
  (natural bottom = 0); `max(0, 48)` now lifts it 48px at feed. Defensible
  (feed bottom safe zone), but revisit if strict pixel-identity is wanted.
- Themes are *safe-correct* on every format but NOT yet per-bucket design-tuned
  (e.g. Story's right=270 action-rail inset shifts content left; fine but plain).
- Altitude's elevation curve currently stays within the safe content width. The
  idealized state the user wants (curve drawn FULL-BLEED while the headline
  stays in the safe area, curve masking the headline) is now *possible* in one
  render tree but not yet implemented — would draw one full-bleed `<svg>` whose
  glyphs use safe coords and whose curve/clip use full-canvas coords.
