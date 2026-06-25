---
name: theme-architecture
description: Read BEFORE adding or refactoring any CROSS-CUTTING theme concern — a new output format / aspect ratio / safe-zone, photo / colour handling shared across themes, a new global rendering knob, or anything that sits BETWEEN a theme and its rendered output. Triggers when you are tempted to wrap themes in an external component, add a mode flag that changes how a theme paints itself, scale/reposition a theme's intact output from the outside, or store theme-shaping data that some other component interprets. Captures the single-source-of-truth + no-inversion-of-control invariants, the format-aware rendering contract, and the FormatFrame anti-pattern that was removed so it is not reintroduced.
---

# theme-architecture

How cross-cutting rendering concerns attach to themes **without** fragmenting
them. A theme (single-card or carousel) is the single source of truth for how it
looks. The job of the app is to hand the theme its inputs and let it render
itself — once, in one place. This skill exists because an earlier approach (the
"Hybrid frame", `FormatFrame`) broke that and had to be unwound; the rules below
are the lessons, with the case study at the end.

If you are adding a knob, capability, colour, or photo policy, read
[`theme-params`](../theme-params/SKILL.md) first — that's the descriptor model.
This skill is about the layer ABOVE that: how output-shaping concerns (format,
size, safe zones, backgrounds) reach the theme.

## The one rule

**A theme is a pure function of its inputs, rendered once.** Inputs flow IN
(`data`, `colors`, `config`, `photoUrl`, and the active `format` via context).
The theme renders ITSELF at the target — nothing outside re-paints, re-scales,
or re-positions its output. If you find yourself writing a component that takes
a theme's render and *does something to it*, stop: that's inversion of control.

## The four invariants

1. **Single source of truth.** Everything about how a theme looks lives in the
   theme (its component + its `defineTheme`/`defineCarouselTheme` descriptor).
   Shared concerns are *provided to* the theme (context/props), never
   *reimplemented around* it. No parallel metadata tables, no second component
   that owns part of the theme's pixels.

2. **No inversion of control.** The app provides inputs → the theme renders.
   Never: app wraps the theme → an external wrapper treats the render as an
   opaque block to scale/anchor/matte. The theme owns its own layout at every
   output size.

3. **No advisory-only data / no dead contracts.** Data that is *meant to shape
   rendering* must be *consumed by* rendering. The classic trap: defining
   per-format `safe` insets and only reading them in a preview-overlay guide
   while the actual layout ignores them — it looks wired up but enforces
   nothing. If data shapes the output, the output must read it.

4. **One code path per visual element.** Each element (the background photo, the
   scrim, the headline) is rendered in exactly ONE place. Never split one element
   across the theme and an external frame with a mode flag to switch between
   them — that's two implementations of one thing, guaranteed to drift.

Corollary — **capability, not "who's-rendering-me" flags.** Give the theme the
context it needs so it always renders correctly (e.g. the active `format`).
Don't add a boolean like `surface="transparent"` that means "render differently
because something external is taking over part of you." A flag that encodes the
caller is a smell; the fix is to give the theme the *information*, not the *mode*.

## The format-aware contract (the correct shape)

Concrete instance of the rules for the export-format concern. The theme renders
directly at the target size and reads it from context:

- `useFormat()` → `{ width, height, safe, bucket, placement }`
  (`theme/shared/format-context.tsx`)
- `useSafeInsets(natural)` → per-side `mergeSafe(format.safe, natural)` =
  `max(theme's own 4:5 margin, platform safe inset)` (`theme/core/export-formats.ts`)
- a **full-bleed layer** — anything that fills the root and ignores safe zones
  (backgrounds, route / elevation silhouettes); just a plain `inset: 0` layer, no
  wrapper primitive needed (the photo layers already self-position)
- `SafeArea` — a flex column inset by the resolved safe area (headlines, stats)

Two coordinate systems (full canvas + safe box) live in the **same render tree**,
so a single element can mask one against the other (e.g. Altitude's claim sliced
by the elevation curve) — impossible when background and content are split across
independent layers.

`mergeSafe`'s `max(natural, safe)` is what preserves fidelity: at the 4:5 master
the theme's own margins win (pixel-identical to before); taller / cover-cropped
formats floor the content clear of platform UI while the background bleeds.

The **carousel strip follows the same contract** — it is two nested format
frames off the one `FormatContext` (no separate machinery, no frame): the
spanning **canvas** reads the *strip* frame (full bleed across `count` slides),
each **panel** reads its own *slide* frame and insets via `SafeArea`. The
teachable equivalence is **canvas : panel :: full-bleed : SafeArea**. The deck
sizes itself from `theme/carousel/geometry.ts` and the carousel **gates** which
buckets it offers (`CAROUSEL_FORMAT_ORDER`). See the `carousel-themes` skill.

```tsx
// A theme is format-aware like this — no external frame, no surface flag:
const { width, height } = useFormat();
const insets = useSafeInsets({ top: 110, right: 90, bottom: 80, left: 90 }); // its 4:5 margins
return (
  <div style={{ width, height, position: "relative", overflow: "hidden" }}>
    {photoUrl ? <PhotoLayer .../> : null}   {/* bleeds — self-positioned */}
    <SafeArea pad={/* natural margins */}>{/* headline, stats, meta */}</SafeArea>
  </div>
);
```

## Red flags (catch these in design + review)

- A new component whose children are `<RenderTheme>` / a theme and whose job is
  to position, scale, matte, or re-paint that render. → inversion of control.
- A `mode` / `surface` / `variant` prop on a theme that means "render differently
  because of who is consuming me." → give it the *information* instead.
- The same visual element (photo, scrim, gradient) rendered in two files with a
  flag choosing which. → collapse to one code path; pass what differs as input.
- Config/data added "for the renderer" that only a preview/overlay reads. →
  dead contract; either consume it in the real output or don't add it.
- A hardcoded `1080`/`1350` (or any single-format assumption) inside something
  that should work at every output size. → read from `useFormat()`.
- "I'll author it once at 4:5 and transform it for everything else." → that's
  exactly the Hybrid frame; author the theme to be format-aware instead.
- A second source of truth for theme metadata (a lookup keyed by theme id that
  duplicates what the descriptor already declares). → derive from the descriptor.

## Decision guide — "I need a new cross-cutting rendering feature"

1. Is it per-theme look? → it belongs IN the theme (component + descriptor). See
   [`theme-params`](../theme-params/SKILL.md).
2. Is it a shared input (a new format, a global photo effect, a colour source)?
   → provide it via context/props (like `FormatContext`, `PhotoFxProvider`,
   `ColorScheme`) and let each theme consume it. Add a small opt-in primitive
   (à la `SafeArea`) if it needs ergonomics — NOT a god-wrapper.
3. Does one element need two coordinate systems / to interact with another? →
   keep them in the same render tree; never split into independent stacked layers
   that can't share geometry.
4. Tempted to wrap/scale/matte the theme from outside? → re-read invariant #2;
   push the concern into the theme as an input instead.

## Case study — the Hybrid frame (`FormatFrame`), removed 2026-06

The thing this skill prevents. To target non-4:5 platforms, an external
`FormatFrame` took the intact 1080×1350 theme render and **scaled it as one
opaque block** into the target, anchored by `placement`, with the photo drawn by
the *frame*. It hit all four anti-patterns at once:

- **IoC:** the frame owned the format; the theme was a passive block. (inv. #2)
- **Fragmentation:** the photo was drawn by the frame in framed mode and by the
  theme in native mode — two `CoverPhoto` code paths reconciled by a
  `surface="transparent"` flag. (inv. #4 + the corollary)
- **Dead contract:** `format.safe` insets were defined but never laid out
  against — only the editor's overlay guide read them, so content landed in a
  platform's caption box purely by the luck of the uniform scale. (inv. #3)
- **Not single source of truth:** the theme's background + effective layout
  depended on an external mode it couldn't see. (inv. #1)

The killer that forced the rewrite: a theme that masks one element with another
across the full-bleed and safe regions (Altitude's claim sliced by the elevation
curve) is impossible when the two live in separate, externally-composed layers.

The fix was the format-aware contract above: delete the frame, give the theme
the `format` as an input, let it render itself. See PR "format-aware single-card
themes" and `theme/shared/format-context.tsx`.
