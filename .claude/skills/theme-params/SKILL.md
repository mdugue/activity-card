---
name: theme-params
description: Use when adding or editing a single-card theme (the defineTheme descriptor), a theme's adjustable knobs (ParamDef specs), its capability declaration (uses/usesWhen + ThemeData narrowing), its colour or photo policy, the unified ColorScheme/ColorChoice model, or the editor category grouping. Read before touching lib/theme-contract.ts, lib/colors.ts, lib/params/, components/app/param-control.tsx, components/app/color-control.tsx, components/app/theme-params.tsx, or a theme's *_PARAMS spec.
---

# theme-params

How a theme describes itself to the app. EVERY theme — single-card or carousel
— is expressed through one shared descriptor core, **`ThemeBase`**
(`lib/theme-contract.ts`: identity, colour policy, photo policy, params). The
families add only their render strategy: a single-card theme is a `defineTheme`
descriptor with a bespoke `Component` (+ capability declaration), collected in
`SINGLE_CARD_THEMES` (`components/themes/index.ts`); a carousel theme is a
token row whose `ThemeBase` shape is derived into `CAROUSEL_THEMES`
(`lib/carousel/theme-tokens.ts`). Everything the editor shows (which toggles
exist, which knobs render, whether the colour control appears, the photo
defaults) derives from the descriptor; there are no parallel metadata tables
and no per-theme control components. `app/page.tsx` treats both modes through
one `activeTheme: ThemeBase` lookup and hands the editors one shared
`EditorSession` object (`components/app/editor-session.ts`).

## The descriptor (`lib/theme-contract.ts`)

```ts
export const editorialTheme = defineTheme({
  id: "editorial", label: "EDITORIAL", tagline: "typography led",
  uses: ["athleteName", "cadence", "elevation", "heartRate", "location", "pace", "route", "speed"],
  usesWhen: { elevation: (d) => d.sport === "ride", cadence: (d) => d.sport === "run" },
  colors: { default: { primary: "#1d3a2e" }, userAdjustable: true },
  photo: { defaultOn: true },
  params: EDITORIAL_PARAMS,        // optional — only themes with knobs
  defaults: DEFAULT_EDITORIAL_CONFIG,
  Component: ThemeEditorial,
});
```

### Capabilities — the declaration IS the contract

`uses` lists the overlay elements the theme renders (`CapabilityKey`: athlete
name, location, heart rate, cadence, power, speed, pace, elevation,
elevationViz, route, splits — each matching its visibility toggle; title /
date / distance / time are a card's core, not capabilities).

- **Type level**: `ThemeData<K>` removes undeclared governed fields
  (`GOVERNED_FIELDS`) from the component's `data` prop — reading
  `data.avgHeartRate` in a theme that didn't declare `heartRate` is a compile
  error at the definition site. The generic is erased at the registry
  (`SingleCardTheme`), same pattern as the param system.
- **Runtime**: `pickThemeData(descriptor, data)` strips undeclared fields
  before render, so the data matches the narrowed type.
- **Editor**: `themeAvailability(data, descriptor)` (`lib/visibility.ts`)
  derives every toggle's availability:
  `dataHas && uses.includes(k) && (usesWhen[k]?.(data) ?? true)`. `usesWhen`
  refines a declared capability per activity (Editorial's elevation row is
  ride-only). The carousel derives the same answer from its stat planner
  (`carouselVisibilityAvailable`).
- Shared helpers a theme passes `data` into take `ActivityView` (every
  governed field optional), so any narrowed `ThemeData` is assignable.

### Colour policy (`lib/colors.ts`)

Themes consume a resolved **`ColorScheme`** (`primary`, optional `secondary`
pair, `onPrimary`, optional photo `roles`); the user picks a **`ColorChoice`**:

- `{ kind: "preset", scheme }` — a static swatch (single hue or pair), or
- `{ kind: "photo", variant }` — one of the five photo-derived strategies (the
  old PhotoMood; see the `image-palette` skill).

One control (`components/app/color-control.tsx`) serves both sources: presets
always; with a photo loaded, the five photo schemes lead with their real
computed swatches badged "FROM YOUR PHOTO". The control is **hidden** when the
active theme's policy says `userAdjustable: false` (Altitude, Minimal, Strata,
Triathlon — their palettes are the design). Reset returns to the theme's
default; `defaultChoice` lets a theme start photo-derived (Photo theme,
Exposure). `resolveColors(choice, themeDefault, palette)` resolves the choice —
a photo choice without a palette falls back to the theme default, and the
choice persists so re-adding a photo restores it. `coerceColorChoice` makes
persisted values safe (hex-validated).

App state is one nullable `colorChoice` (`null` = active theme's default);
carousel themes get their policy from their token row via
`carouselColorPolicy`.

### Photo policy

`photo: { defaultOn, defaultFilter?, defaultGrain? }` — whether an uploaded
photo shows by default and the signature filter/grain look applied when one is
added (carousel: `carouselPhotoPolicy` from the token row). Display is gated by
the shared `photoBackdrop` visibility toggle in **both** modes; the filter /
grain / mirror / rotate controls render only while the photo is shown. See the
`card-rendering` skill for the photo-fx context + `CoverPhoto` geometry.

## Parameters (`lib/params/`)

A `ParamDef` is a discriminated union on `kind`:

- **`toggle`** — boolean → `ToggleRow`.
- **`slider`** — number with `min`/`max`/`step`/`unit` → `Slider` + readout.
- **`segmented` | `select`** — a string option id with `options` (and optional
  `optionIds`) → tile group or `RichSelect`.

Every param carries `id`, `group` (the editor category it files into), `label`,
`default`, optional `visibleWhen(config)` (conditional controls — Altitude's
cutout opacity only in cutout mode). `ParamGroup`:
`style` · `layout` · `photo` · `text` · `stats` · `marks` · `activity`. The
editor only creates a LAYOUT/MARKS tab when the theme declares params there.

**Calculated options**: `options` may be `(ctx: ParamCtx) => ParamOption[]`
where `ctx = { data, palette }` — used when the control must display computed
values (Altitude's headline select shows each metric's live value via
`claimOptions`/`resolveClaim`; declare `optionIds` so coercion keeps a fixed id
space). Calculated *output* from a fixed choice needs no schema work — the
component derives it at render.

**Config**: per-theme configs live in one `themeConfigs: Record<string,
unknown>` slot in `app/page.tsx`, keyed by theme id (single-card `strata` and
carousel `strata` share `"strata"`, so the same knobs drive both). Reads go
through `coerceConfig(activeTheme.defaults, activeTheme.params, raw)`
(`lib/params/resolve.ts`): wrong type, out-of-range slider, unknown option id →
default; unknown keys dropped. Param specs live on the theme descriptors —
there is no separate spec registry. Config interfaces
`extends Record<string, unknown>`.

**Rendering**: `components/app/param-control.tsx` maps one `ParamDef` to a
primitive; `components/app/theme-params.tsx` renders a theme's params for one
category. The component reads its own typed config off `ThemeProps` (defaulted
to `DEFAULT_*_CONFIG` so stories can omit it).

Full walkthrough with skeletons and checklists: `docs/creating-a-theme.md`.

## Adding a theme / a knob

1. **New single-card theme** — one file in `components/themes/single-card/`
   exporting the component + `defineTheme` descriptor; add it to
   `SINGLE_CARD_THEMES` and `THEME_ORDER`; colocate a story. The compiler
   verifies the `uses` list against what the component reads.
2. **New knob** — add a `ParamDef` to the theme's `*_PARAMS` spec (pure data in
   `lib/<theme>.ts`, JSX-free and testable) and reference it from the theme's
   descriptor (`defineTheme` `params`/`defaults`, or the carousel token row's
   `params`/`defaults`). Nothing else to wire.
3. **Tests** — pure logic in `lib/<theme>.test.ts`; registry/contract
   invariants live in `lib/theme-registry.test.ts`,
   `lib/theme-contract.test.ts`, `lib/colors.test.ts`.
