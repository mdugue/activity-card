# Creating a new theme

A practical, end-to-end guide for adding a theme to Effort — for humans and
coding agents alike. It covers both families: the **single card** (one
1080×1350 poster) and the **carousel** (a seamless n×1080 strip). If you only
need to tweak an existing theme's knobs, jump to
[Adding a knob](#adding-an-adjustable-knob-to-a-theme).

Before starting, skim the focused references — they explain *why* the
constraints below exist:

- `.claude/skills/theme-params/SKILL.md` — the descriptor + parameter + colour model
- `.claude/skills/card-rendering/SKILL.md` — html-to-image rules, route/elevation SVG math
- `.claude/skills/carousel-themes/SKILL.md` — the carousel token system
- `.claude/skills/sport-data/SKILL.md` — which metrics matter per sport, units

---

## Which family?

| You want…                                            | Build a…          |
| ---------------------------------------------------- | ----------------- |
| one poster image with its own layout & typography    | single-card theme |
| a multi-slide Instagram story with a spanning hero   | carousel theme    |

They are independent systems with separate id spaces. A "theme" that should
exist in both (like STRATA) is two registrations sharing pure logic from
`lib/`.

---

## A new single-card theme

A single-card theme is **one file** in `components/themes/single-card/`
exporting two things: the component and a `defineTheme` descriptor. The
descriptor is the entire interface to the app — registry, editor, dispatch all
derive from it. There is nothing else to wire: no metadata table, no control
component, no app-state field, no dispatcher branch.

### Step 1 — create the file

`components/themes/single-card/<name>.tsx` (kebab-case file, PascalCase
component). Start from this skeleton:

```tsx
// <NAME> — one line on the design idea. Typeface choices. Palette idea.

import { defineTheme, type ThemeProps } from "@/lib/theme-contract";
import { PhotoLayer } from "../shared/photo-layer";

// The overlay elements this theme renders. This list is COMPILER-CHECKED:
// `data` is narrowed to exactly these capabilities, so reading a field you
// didn't declare is a type error — and each declared key gets a visibility
// toggle in the editor automatically.
const USES = ["route", "location", "elevation"] as const;

const DEFAULT_ACCENT = "#c45a2c";

export function ThemeExample({
  data,
  photoUrl,
  imageTransform,
  colors,
}: ThemeProps<(typeof USES)[number]>) {
  const accent = colors?.primary ?? DEFAULT_ACCENT;
  return (
    <div style={{ width: 1080, height: 1350, position: "relative", overflow: "hidden" }}>
      {photoUrl ? (
        <PhotoLayer imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}
      {/* …layout: title, stats, route SVG via routePath()… */}
    </div>
  );
}

export const exampleTheme = defineTheme({
  id: "example",
  label: "EXAMPLE",
  tagline: "three words, lowercase",
  uses: USES,
  // Sport-aware refinements: a declared capability that only renders for some
  // activities greys its toggle out for the rest.
  // usesWhen: { elevation: (d) => d.sport === "ride" },
  colors: { default: { primary: DEFAULT_ACCENT }, userAdjustable: true },
  photo: { defaultOn: true },
  Component: ThemeExample,
});
```

### Step 2 — declare honestly (`uses` / `usesWhen`)

- List **every** capability the theme draws: `athleteName`, `location`,
  `heartRate`, `cadence`, `power`, `speed`, `pace`, `elevation`,
  `elevationViz`, `route`, `splits`. Title/date/distance/time are a card's
  core — always available, never declared.
- Run `bun typecheck` and let the compiler negotiate the list with you:
  reading an undeclared field errors; a declared-but-unused capability shows a
  dead toggle in the editor (don't do that).
- Use `usesWhen` when a capability is sport-conditional (e.g. Editorial's
  elevation row is ride-only). Keep these predicates mirrors of the actual JSX
  conditions.
- Shared helpers (`isMultiActivity`, `resolveClaim`, …) accept any narrowed
  data — they're typed against `ActivityView`. If you write a new shared
  helper that takes the whole activity, type its parameter `ActivityView`,
  not `ActivityData`.

### Step 3 — pick the colour policy

- **Adjustable** (`userAdjustable: true`): consume `colors.primary` (and
  optionally `colors.secondary`) everywhere the accent appears; set the
  theme's own hue as `colors.default`. The user then gets the unified COLOUR
  control — static presets *and*, once a photo is loaded, the five
  photo-derived schemes.
- **Fixed** (`userAdjustable: false`): the palette is the design (Minimal,
  Altitude, Strata, Triathlon). The control hides; still set `colors.default`
  to something representative.
- Photo-first themes can add `defaultChoice: { kind: "photo", variant: "vibrant" }`
  so they start with photo-derived colours (see the Photo theme).

### Step 4 — pick the photo policy

Every theme can show a background photo; you only choose the defaults:

```ts
photo: { defaultOn: true, defaultFilter: "fade", defaultGrain: true }
```

- `defaultOn: false` for dense/designed looks that should lead photo-free
  (Data, Triathlon, Strata). The user can still toggle "Use as background".
- Render the photo with a **shared layer** — don't hand-roll one:
  - `PhotoLayer` — full-bleed hero (rotation-correct via `CoverPhoto`)
  - `PhotoBackdrop` — blurred art-print wash (`treatment: "path" | "editorial"`)
  - `PhotoUnderlay` — faint wash under dense data layouts
  Filter / grain / mirror / rotate then work automatically (they arrive via
  the photo-fx context — your component never sees them).

### Step 5 — register

In `components/themes/index.ts`: add the descriptor to `SINGLE_CARD_THEMES`
and the id to `THEME_ORDER`. Done — picker label, visibility toggles, colour
control, photo defaults, dispatch and persistence all follow.

### Step 6 — rendering rules (export-safe)

These are hard constraints from the PNG pipeline (`card-rendering` skill):

- Canvas is exactly **1080×1350**, inline styles for everything that must
  rasterise (theme shadows stay inline, not Tailwind).
- **No `backdrop-filter`**, no live SVG `<filter>` on photos — html-to-image
  mishandles them. Inline `filter`, SVG-as-image (`GRAIN_BG`) are safe.
- Route/elevation geometry comes from `lib/chart-helpers.ts`
  (`routePath`, `projectRoute`, `sequenceProfiles`) — **uniform scale,
  centred; never stretch a route per-axis.**
- Format numbers via `lib/format.ts`; the formatters dash on missing data.
- Handle multi-activity (triathlon/brick) via `lib/multi-activity.ts` —
  a project keeps its geometry on `segments`, the top-level route/profile are
  undefined.
- No `console.log`; sport-specific stat choices per the `sport-data` skill.

### Step 7 — knobs (optional)

If the theme has adjustable parameters (a mood, a density, a headline picker),
declare them as data — see
[Adding a knob](#adding-an-adjustable-knob-to-a-theme).

### Step 8 — story (required)

`components/themes/single-card/<name>.stories.tsx`. A theme is not done until
it renders in Storybook:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import { type BackgroundArgs, backgroundArgTypes } from "../../../.storybook/backgrounds";
import { ThemeExample } from "./example";

const meta = {
  component: ThemeExample,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  argTypes: { ...backgroundArgTypes },   // photo preview controls
  args: { data: SAMPLE_RIDE },
} satisfies Meta<ComponentProps<typeof ThemeExample> & BackgroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Elbsandstein/)).toBeVisible();
  },
};
export const Run: Story = { args: { data: SAMPLE_RUN } };
// + one story per interesting config/sport variant
```

### Step 9 — verify

```bash
bun lint && bun typecheck && bun run test   # registry invariants cover your descriptor
bun run build-storybook                     # every story must compile
bun dev                                     # switch to the theme, check:
#  - only your declared toggles appear (and grey out per usesWhen)
#  - colour control present/hidden per policy; photo + filters behave
PLAYWRIGHT_BROWSERS_PATH=… bun run test:e2e e2e/themes.spec.ts
```

`e2e/themes.spec.ts` iterates the theme rail, so your theme is smoke-tested
(renders without console errors) without writing a new spec.

### Checklist

- [ ] One file in `components/themes/single-card/` with component + `defineTheme`
- [ ] `uses` complete & honest (compiler-negotiated); `usesWhen` mirrors the JSX
- [ ] Colour policy chosen; adjustable themes consume `colors.primary`
- [ ] Photo policy chosen; photo rendered via a shared layer
- [ ] Registered in `SINGLE_CARD_THEMES` + `THEME_ORDER`
- [ ] Knobs (if any) as `ParamDef`s in `lib/<name>.ts` + `THEME_PARAM_SPECS`
- [ ] Colocated story, tagged `ai-generated`, with `backgroundArgTypes`
- [ ] `bun lint && bun typecheck && bun run test && bun run build-storybook` green

---

## A new carousel theme

A carousel theme is **a token row**, not a component — one shared renderer
(`components/themes/carousel/seamless-canvas.tsx`) draws every theme. Deep
dive: the `carousel-themes` skill.

1. **Add the id** to `CarouselThemeId` and a row to `CAROUSEL_THEME_TOKENS`
   (`lib/carousel/theme-tokens.ts`); append the id to `CAROUSEL_THEME_ORDER`.
   The signature levers: `heroLayer` (route / elevation / photo / none),
   `panelKind` (standard / frame / press), `heroMetric`, `deck` (3 or 4
   slides), `crossViz`, `detailViz`, `fontPair`, the colours
   (`background/ink/mutedInk/accent/accent2/onAccent`, `dark`), and the photo
   look (`defaultFilter`, `defaultGrain`). A photo-first theme may set
   `defaultColorChoice: { kind: "photo", variant: "vibrant" }`.
2. **Reuse a `panelKind`** if possible. A new kind means a panel component
   under `components/themes/carousel/panels/` (it receives the shared
   `PanelProps` bag — pre-resolved style + planned stats; never re-derive
   those locally), wired in `panelFor` (seamless-canvas) and the planner
   branch in `planSlideStats` (`lib/carousel/stats.ts`).
3. **Add a story** in
   `components/themes/carousel/seamless-canvas.stories.tsx` — one export per
   theme id, built with the existing `themeArgs(id)` helper.
4. **Verify** as above; `e2e/carousel.spec.ts` covers the deck mechanics.

Colour and photo behaviour come for free: every carousel theme is
colour-adjustable (policy derived from its tokens via `carouselColorPolicy`)
and shows the photo per `carouselPhotoPolicy` + the shared "Use as background"
toggle.

---

## Adding an adjustable knob to a theme

Knobs are **data, not components** (`theme-params` skill has the full model):

1. Define (or extend) the theme's `*_PARAMS: ParamDef[]` in `lib/<theme>.ts` —
   pure, JSX-free, unit-testable. Pick the `kind` (`toggle` / `slider` /
   `segmented` / `select`), the editor `group`
   (`style`·`layout`·`photo`·`text`·`stats`·`marks`·`activity`), a `default`,
   and for choices the `options` (a static list, or `(ctx) => options` when
   the control shows computed values — `ctx` carries the activity and the
   extracted photo palette; declare `optionIds` for dynamic sets).
   `visibleWhen(config)` makes a control conditional on another knob.
2. Add the field to the theme's config interface
   (`extends Record<string, unknown>`) and its `DEFAULT_*_CONFIG`.
3. For a theme gaining its first knobs: add a `{ defaults, params }` row to
   `THEME_PARAM_SPECS` (`lib/params/registry.ts`) and pass
   `params`/`defaults` in its `defineTheme` call.
4. Read the value off the component's typed `config` prop.
5. Add a story variant exercising the knob, and a `bun:test` for any new pure
   logic. The control renders generically — there is nothing else to build.

---

## Where things live (quick map)

```
lib/theme-contract.ts                     defineTheme · capabilities · ThemeData · ThemeProps
lib/colors.ts                             ColorScheme · ColorChoice · resolveColors
lib/params/                               ParamDef model · registry · coercion
lib/activity.ts                           the ActivityData model
lib/chart-helpers.ts                      route/elevation projection (uniform scale!)
lib/<theme>.ts                            a theme's pure logic + *_PARAMS (bun-tested)
components/themes/index.ts                SINGLE_CARD_THEMES registry + THEME_ORDER
components/themes/single-card/<name>.tsx  a single-card theme (component + descriptor)
components/themes/shared/                 PhotoLayer · PhotoBackdrop · PhotoUnderlay ·
                                          CoverPhoto · photo-fx context · OverlayRoute
components/themes/carousel/               the carousel renderer + templates/panels
lib/carousel/theme-tokens.ts              carousel theme rows (CarouselThemeId)
```
