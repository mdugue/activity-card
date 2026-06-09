---
name: theme-params
description: Use when adding or editing a theme's adjustable knobs (the editor controls a theme exposes), the unified parameter schema, the per-theme config + its coercion/persistence, or the editor category grouping. Covers the ParamDef model in lib/params/, the bespoke-slot vocabulary, calculated options (data-/palette-derived), resolveThemeConfig, and how a theme's controls render generically. Read before touching lib/params/, components/app/param-control.tsx, components/app/theme-params.tsx, or a theme's *_PARAMS spec.
---

# theme-params

How a theme's adjustable controls work. A theme declares **parameters** as data;
the editor renders them generically and stores their values in one coerced,
per-theme config slot. There are no per-theme control components or per-theme app
state — adding a knob is one edit to the theme's param spec.

## The model (`lib/params/kinds.ts`)

A `ParamDef` is a discriminated union on `kind`:

- **`toggle`** — boolean. → `ToggleRow`.
- **`slider`** — number, with `min`/`max`/`step`/`unit`. → `Slider` + readout.
- **`segmented` | `select`** — a string option id, with `options` (and optional
  `optionIds`). → a `ToggleGroup` of tiles, or a `RichSelect`.

Every param carries `id` (key into the config), `group` (which editor category it
files into), `label`, `default`, and optionally `visibleWhen(config)` (a
declarative predicate for conditional controls). The union keeps `min`/`max` on
sliders and `options` on choices — an invalid combination can't be expressed.

`ParamGroup` is the category the control appears under:
`style` · `layout` · `photo` · `text` · `stats` · `marks` · `activity`
(STYLE = colour & atmosphere; LAYOUT = composition & type; MARKS = annotations).
The category lives on the param, so a new param auto-files itself; the editor
only creates a LAYOUT/MARKS tab when the theme declares params there.

## Two kinds of parameter

- **Shared** — universal meaning *and* value space (accent, photo filter/grain,
  visibility toggles, carousel marks). These are rendered by purpose-built blocks
  in `components/app/activity-tools.tsx`, not by per-theme specs.
- **Bespoke** — value space owned by the theme (Strata `mood`, Altitude
  `headline`). Declared in the theme's `*_PARAMS` spec. The **options travel with
  the theme**, so two themes can both expose a `mood` slot with *different*
  option sets under one consistent label/widget. Keep bespoke slot ids consistent
  across themes (a `mood`/`density`/`headline`/`treatment` vocabulary) rather than
  inventing synonyms.

## Calculated options

`options` may be a static `ParamOption[]` or a function `(ctx: ParamCtx) =>
ParamOption[]` where `ctx = { data, palette }`. Use the function form when the
control must *display* computed values:

- **Altitude `headline`** — only the metrics this activity has, each showing its
  live value (`claimOptions`/`resolveClaim`). Declares `optionIds` (the fixed id
  space) so coercion still works.
- **Photo `palette`** — each colour strategy shows its real accent swatch
  (`ctx.palette.themes[variant].accent`, pre-built in `ExtractedPalette.themes`).
  A `ParamOption.swatch` renders as the option's leading glyph.

Calculated *output from a fixed choice* (e.g. the Photo theme's actual colours)
needs no schema work — the theme component derives it at render from its config.

## Config: one slot, coerced

Per-theme configs live in a single `themeConfigs: Record<string, unknown>` in
`app/page.tsx`, keyed by a config key shared across families (single-card `strata`
and carousel `strata` both use `"strata"`). Reads go through
`resolveThemeConfig(key, raw)` (`lib/params/registry.ts`), which merges the raw
value over the theme's defaults and **coerces** every field (`coerceConfig` in
`lib/params/resolve.ts`): wrong type, out-of-range slider, or unknown option id →
fall back to default; unknown keys dropped. This is the single place stale /
hand-edited localStorage is made safe. Legacy single-key configs are migrated on
load (`migrateThemeConfigs`).

Config interfaces (`AltitudeConfig`, `StrataConfig`, `PhotoConfig`) `extends
Record<string, unknown>` so they flow through the generic slot without casts;
declared keys keep their precise types.

## Rendering

- `components/app/param-control.tsx` — `ParamControl` maps one `ParamDef` to a
  primitive. Value is `unknown` at this boundary; the theme body stays typed.
- `components/app/theme-params.tsx` — `ThemeParamGroup` renders a theme's params
  for one category (honouring `visibleWhen`); `themeDeclaresGroup` decides whether
  the editor creates that category's tab.
- The theme component reads its own typed config (`config?: AltitudeConfig`) and
  defaults via `DEFAULT_*_CONFIG`. `RenderTheme` passes the coerced config in
  generically and provides the photo-effects context.

## Adding / editing a theme's knobs

1. Add (or edit) the param in the theme's `*_PARAMS` spec in `lib/<theme>.ts`
   (pure data — keep it JSX-free and testable). Set `group`, `kind`, `default`,
   and for choices the `options` (+ `optionIds` if dynamic).
2. Add the key + `{ defaults, params }` row to `THEME_PARAM_SPECS`
   (`lib/params/registry.ts`) if the theme is new. Nothing else to wire — the
   editor, coercion, and persistence pick it up.
3. Read the value in the theme component off its typed config.
4. Cover the pure logic with a `bun:test` (`lib/<theme>.test.ts`); the registry
   invariants are checked in `lib/params/registry.test.ts`.

## Photos

Every theme renders a background photo, gated only by the `photoBackdrop`
visibility flag (default per theme via `THEME_META.photoDefaultOn`). Filter /
grain / mirror (`PhotoEffects`) apply to all themes through a context
(`components/themes/photo-fx.tsx`) read by the shared photo layers — see the
`card-rendering` skill.
