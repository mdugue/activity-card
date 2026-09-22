/**
 * Linting is oxlint (with `--type-aware`, which loads `oxlint-tsgolint` for the
 * rules that need type information) on top of Ultracite's presets. It replaces
 * the previous Biome + ESLint pair: one binary now covers the `eslint`,
 * `typescript`, `unicorn`, `import`, `react`, `react-perf`, `jsx-a11y`,
 * `nextjs`, `promise`, `node`, `jsdoc` and `oxc` rule sets that used to be
 * split between the two, so there is a single config, a single ignore list and
 * a single pass in CI.
 *
 * Deviations from Ultracite's defaults are grouped below with the reason each
 * one exists. Anything not listed here is on — including the type-aware
 * `typescript/no-floating-promises` / `no-misused-promises` family, which is
 * new to this repo and had no Biome equivalent.
 *
 * Note: the `@remotion/eslint-plugin` and `eslint-plugin-storybook` rules have
 * no oxlint equivalent and are gone with ESLint. `bun run build-storybook` and
 * `bun run video:render` remain the checks that those two areas still compile.
 */
import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // Vendored agent skills installed via `npx skills add`, pinned by
    // skills-lock.json. Third-party content — re-add/update, don't edit.
    "**/skills",
    // Generated, gitignored test artifacts — the Playwright HTML report
    // bundles minified vendor JS that would otherwise be flagged by the
    // thousand.
    "**/playwright-report",
    "**/test-results",
  ],
  rules: {
    // ── House style, deliberately different from Ultracite ──────────────
    // Components and module-level helpers are `function` declarations
    // (AGENTS.md: "Components are PascalCase named exports"). Hoisting is
    // what lets a file read top-down — the exported component first, its
    // private helpers and constants below it.
    "eslint/func-style": "off",
    "eslint/no-use-before-define": "off",
    "react/function-component-definition": "off",
    // Object literals are ordered by meaning (the card's own field order, a
    // sport's metric priority), not alphabetically.
    "eslint/sort-keys": "off",
    // This codebase documents *why* inline, next to the line it explains.
    // That is a convention worth keeping, not a smell.
    "eslint/no-inline-comments": "off",
    // `for (let i = 0; i < n; i++)` is the clearest way to walk the route
    // point / carousel slide arrays that most of the geometry code deals in.
    "eslint/no-plusplus": "off",
    // Colour and geometry math (lib/palette.ts, lib/strata.ts) uses bit ops
    // deliberately.
    "eslint/no-bitwise": "off",
    // Reads worse than the property access it replaces in most of this code.
    "eslint/prefer-destructuring": "off",
    // Most regexes here are two-token file-extension or slug matchers; named
    // groups would be noise.
    "eslint/prefer-named-capture-group": "off",
    // `lib/strava-client.ts` groups its two error subclasses in one file.
    "eslint/max-classes-per-file": "off",
    // Export delivery is sequential on purpose — browsers throttle
    // back-to-back downloads, so the loop awaits between files.
    "eslint/no-await-in-loop": "off",
    // Wrapping a callback API (FileReader, canvas.toBlob) in `new Promise` is
    // the point of those helpers.
    "promise/avoid-new": "off",
    // `.then()` in an effect keeps the effect's cleanup synchronous, which an
    // `async` IIFE does not.
    "promise/prefer-await-to-then": "off",
    // Helpers that close over a component's props/state stay inside it.
    "unicorn/consistent-function-scoping": "off",
    // `reduce` / `forEach` are fine in the parsing and geometry helpers.
    "unicorn/no-array-reduce": "off",
    "unicorn/no-array-for-each": "off",
    // `charCodeAt` is intentional in the palette hash — code points would
    // change the hash for astral characters.
    "unicorn/prefer-code-point": "off",
    // Callback props are named for what they do (`onEffectsChange`,
    // `onTransformChange`, `select`); the rule wants `onX={handleX}` pairs.
    "react/jsx-handler-names": "off",
    // `toSorted()` would narrow the browser floor (Safari 16+) for a cosmetic
    // win; every call site that must not mutate already copies explicitly.
    "unicorn/no-array-sort": "off",
    // `Number.parseInt` prefix parsing is the point in the Strava param and
    // CDN-suffix helpers — `Number()` would turn "576x768" into NaN.
    "unicorn/prefer-number-coercion": "off",
    // `setState` inside `.then()` is not a callback chain.
    "promise/no-callback-in-promise": "off",
    // `error` is the name, except where a component already has an `error`
    // state in scope — then `err` is the escape, not a shadowed rebinding.
    "unicorn/catch-error-name": ["error", { ignore: ["^err$"] }],
    // Branchy-by-nature normalisation (GPX parsing, the Strava → ActivityData
    // mapper, the page-level mode switch) reads better as one flat function
    // than as helpers that each take the same eight fields.
    complexity: ["error", 30],
    // React Compiler bailout notes (try/finally, reorderable expressions).
    // Informational, not defects: the compiler simply skips those components.
    "react/todo": "off",

    // ── Type-aware rules (`--type-aware`, via oxlint-tsgolint) ──────────
    // The promise, deprecation and assertion checks below are the reason this
    // repo runs type-aware linting at all; only these four are dialled back.
    //
    // Truthiness is this codebase's idiom for "absent or empty" (`if (!src)`,
    // `if (!ctx)`); spelling every one of them out as an explicit null/length
    // check would obscure more than it clarifies.
    "typescript/strict-boolean-expressions": "off",
    // `onClick={() => setOpen(true)}` is the shape every handler here takes.
    "typescript/no-confusing-void-expression": "off",
    // Early-return guards that fall through to an implicit `undefined` are
    // deliberate in the series/profile pickers.
    "typescript/consistent-return": "off",
    // Whether a function is `async` or returns a promise is an implementation
    // detail its callers already await.
    "typescript/promise-function-async": "off",
    // `||` is load-bearing in the metric plumbing: a 0 cadence, a 0 distance or
    // an empty athlete name all mean "not recorded" and must fall through to
    // the next source, which `??` would not do.
    "typescript/prefer-nullish-coalescing": "off",
    // In a React event handler an `async` callback is the normal shape and the
    // `() => { void f(); }` wrapper adds nothing; the conditional and spread
    // checks that actually catch bugs stay on below.
    "typescript/no-misused-promises": ["error", { checksVoidReturn: false }],
    "typescript/strict-void-return": "off",
    // Contradicts `typescript/no-non-null-assertion`, which is also on and is
    // the stricter of the two: `x as T` is the form this repo uses.
    "typescript/non-nullable-type-assertion-style": "off",
    // Narrowing `as` at an `unknown` boundary — `Object.keys(x) as
    // CapabilityKey[]`, a coerced param config, a parsed cookie payload — is
    // how the theme contract and the Strava client are typed throughout.
    "typescript/no-unsafe-type-assertion": "off",
  },
  overrides: [
    {
      // Theme cards are faithful ports of design prototypes; loosen the rules
      // that punish their seeded arrays, sport-branch density and 1080×1350
      // inline layout styles. (Editor/core/export under theme/ stay strict —
      // only the card families and their shared render helpers are relaxed.)
      files: ["theme/single-card/**", "theme/carousel/**", "theme/shared/**"],
      rules: {
        complexity: "off",
        "oxc/no-barrel-file": "off",
        "react/no-array-index-key": "off",
        "unicorn/prefer-at": "off",
      },
    },
    {
      // `components/ui/**` and `hooks/use-mobile.ts` are scaffolded by the
      // shadcn / Next.js CLIs and re-added with `bunx shadcn add` — never
      // hand-edited. Lint them at the level their generator ships, so a
      // re-scaffold is never a lint failure.
      files: ["components/ui/**", "hooks/use-mobile.ts"],
      rules: {
        "eslint/eqeqeq": "off",
        "eslint/no-eq-null": "off",
        "eslint/no-nested-ternary": "off",
        "eslint/no-param-reassign": "off",
        "eslint/no-shadow": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/control-has-associated-label": "off",
        "jsx-a11y/label-has-associated-control": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/prefer-tag-over-role": "off",
        "oxc/no-barrel-file": "off",
        "react/button-has-type": "off",
        "react/hook-use-state": "off",
        "react/jsx-handler-names": "off",
        "react/jsx-no-constructed-context-values": "off",
        "react/no-array-index-key": "off",
        "react/no-danger": "off",
        "react/no-unstable-nested-components": "off",
        "react/set-state-in-effect": "off",
        "react/style-prop-object": "off",
        "typescript/consistent-type-definitions": "off",
        "typescript/no-deprecated": "off",
        "typescript/no-unsafe-argument": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-call": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/restrict-template-expressions": "off",
        "unicorn/no-document-cookie": "off",
        "unicorn/prefer-spread": "off",
      },
    },
    {
      // Storybook types its decorator `context`, `args` and parameter bags
      // loosely, so the whole `no-unsafe-*` family fires on ordinary story
      // code. Stories are dev-only and `bun run build-storybook` type-checks
      // them.
      files: [".storybook/**"],
      rules: {
        "typescript/no-unsafe-argument": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-call": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-return": "off",
        "typescript/no-redundant-type-constituents": "off",
      },
    },
    {
      // Composition metadata is re-exported under video-specific names
      // (`HERO_FPS`), while the source constant is also used in the file — so
      // the plain import has to stay alongside the aliased export.
      files: ["remotion/videos/**"],
      rules: {
        "unicorn/prefer-export-from": "off",
      },
    },
    {
      // Tests read more clearly with literal fixtures: an inline `javascript:`
      // URL in a sanitisation assertion, a nested ternary in a table-driven
      // case, a top-level helper in the Bun mock server.
      files: ["**/*.test.ts", "e2e/**", "playwright.config.ts"],
      rules: {
        "eslint/no-implicit-globals": "off",
        "eslint/no-nested-ternary": "off",
        "eslint/no-script-url": "off",
        // A control-character fixture asserts on the literal \x7F byte.
        "unicorn/no-hex-escape": "off",
      },
    },
  ],
});
