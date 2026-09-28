/**
 * Linting is oxlint with `--type-aware` (via `oxlint-tsgolint`) on top of
 * every Ultracite preset that applies to this stack, taken as shipped:
 *
 * - `core` — eslint, typescript, unicorn, oxc, import, promise, node, jsdoc…
 * - `react` + `next` — oxlint's native react, react-perf, jsx-a11y and nextjs
 *   rule sets.
 * - `js-plugins` + `next/js-plugins` — eslint-plugin-github,
 *   eslint-plugin-sonarjs and React Doctor (incl. its Next.js rules), run
 *   through oxlint's JS-plugin bridge.
 * - `jest` — the jest rule set, which also understands `bun:test`.
 * - `anti-slop` — the stricter TypeScript evidence rules (safety comments on
 *   assertions, no `unknown` leaking through signatures, …).
 *
 * On top of Ultracite, the framework plugins ESLint used to provide are back
 * as JS plugins: `eslint-plugin-storybook` for stories and
 * `@remotion/eslint-plugin` for the video compositions.
 *
 * There are deliberately NO rule deviations from the presets. When a rule
 * fires, change the code; when a single line genuinely cannot comply, use a
 * targeted `oxlint-disable-next-line <rule> -- <reason>` there, never a
 * config-level switch. The one exception is generated code (below).
 *
 * `eslint-plugin-github` and `eslint-plugin-sonarjs` import the TypeScript
 * compiler API, which TypeScript 7 does not ship. `package.json` therefore
 * installs TS 7 as `@typescript/native` (it owns the `tsc` binary) and aliases
 * `typescript` to the TS 6 API package — the side-by-side setup the TS 7
 * release notes recommend.
 */
import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import jest from "ultracite/oxlint/jest";
import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next, jest, jsPlugins, nextJsPlugins, antiSlop],
  // Re-declared on the root so dependency analysers see the plugin packages
  // (oxlint itself loads them from the extended presets either way).
  jsPlugins: [
    ...(jsPlugins.jsPlugins ?? []),
    ...(antiSlop.jsPlugins ?? []),
    { name: "storybook", specifier: "eslint-plugin-storybook" },
    { name: "remotion", specifier: "@remotion/eslint-plugin" },
  ],
  // oxlint does not merge `settings` from extended configs.
  settings: jsPluginSettings,
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // Vendored agent skills (`.agents/skills`, `.claude/skills`), installed
    // via `npx skills add` and pinned by skills-lock.json. Third-party
    // content — re-add/update, don't edit.
    "**/skills",
    // Generated, gitignored test artifacts.
    "**/playwright-report",
    "**/test-results",
  ],
  overrides: [
    {
      // eslint-plugin-storybook's flat/recommended + flat/csf-strict sets.
      files: ["**/*.stories.tsx"],
      rules: {
        "storybook/await-interactions": "error",
        "storybook/context-in-play-function": "error",
        "storybook/csf-component": "error",
        "storybook/default-exports": "error",
        "storybook/hierarchy-separator": "error",
        "storybook/meta-inline-properties": "error",
        "storybook/meta-satisfies-type": "error",
        "storybook/no-redundant-story-name": "error",
        "storybook/no-renderer-packages": "error",
        "storybook/no-stories-of": "error",
        "storybook/no-title-property-in-meta": "error",
        "storybook/prefer-pascal-case": "error",
        "storybook/story-exports": "error",
        "storybook/use-storybook-expect": "error",
        "storybook/use-storybook-testing-library": "error",
      },
    },
    {
      files: [".storybook/main.ts"],
      rules: {
        "storybook/no-uninstalled-addons": "error",
      },
    },
    {
      // Every @remotion/eslint-plugin rule, all at "error".
      files: ["remotion/**", "remotion.config.ts"],
      rules: {
        "remotion/deterministic-randomness": "error",
        "remotion/duration-in-frames": "error",
        "remotion/even-dimensions": "error",
        "remotion/from-0": "error",
        "remotion/no-background-image": "error",
        "remotion/no-object-fit-on-media-video": "error",
        "remotion/no-string-assets": "error",
        "remotion/non-pure-animation": "error",
        "remotion/slow-css-property": "error",
        "remotion/staticfile-no-relative": "error",
        "remotion/staticfile-no-remote": "error",
        "remotion/use-gif-component": "error",
        "remotion/v4-config-import": "error",
        "remotion/valid-composition-and-folder-name": "error",
        "remotion/volume-callback": "error",
        "remotion/warn-native-media-tag": "error",
      },
    },
    {
      // Generated code, not ours: `components/ui/**` and `hooks/use-mobile.ts`
      // are scaffolded by the shadcn CLI and re-added with `bunx shadcn add` —
      // never hand-edited (AGENTS.md). Lint them at the level the generator
      // ships so a re-scaffold is never a lint failure. Nothing else in the
      // repo gets a rule switched off.
      files: ["components/ui/**", "hooks/use-mobile.ts"],
      rules: {
        "anti-slop/no-runtime-typeof": "off",
        "anti-slop/no-unknown-parameters": "off",
        "anti-slop/require-safety-comment-for-type-assertion": "off",
        "eslint/complexity": "off",
        "eslint/eqeqeq": "off",
        "eslint/func-style": "off",
        "eslint/no-eq-null": "off",
        "eslint/no-nested-ternary": "off",
        "eslint/no-param-reassign": "off",
        "eslint/no-shadow": "off",
        "eslint/no-use-before-define": "off",
        "eslint/sort-keys": "off",
        "github/a11y-aria-label-is-well-formatted": "off",
        "github/a11y-no-title-attribute": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/label-has-associated-control": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/prefer-tag-over-role": "off",
        "react/button-has-type": "off",
        "react/function-component-definition": "off",
        "react/hook-use-state": "off",
        "react/jsx-no-constructed-context-values": "off",
        "react/no-danger": "off",
        "react/no-unstable-nested-components": "off",
        "react/set-state-in-effect": "off",
        "react-doctor/effect-needs-cleanup": "off",
        "react-doctor/js-combine-iterations": "off",
        "react-doctor/no-array-index-as-key": "off",
        "react-doctor/no-pass-data-to-parent": "off",
        "react-doctor/no-pass-live-state-to-parent": "off",
        "react-doctor/no-prop-callback-in-effect": "off",
        "react-doctor/only-export-components": "off",
        "react-doctor/prefer-dynamic-import": "off",
        "react-doctor/rerender-memo-before-early-return": "off",
        "sonarjs/expression-complexity": "off",
        "sonarjs/function-name": "off",
        "sonarjs/max-union-size": "off",
        "sonarjs/no-nested-conditional": "off",
        "sonarjs/no-wildcard-import": "off",
        "sonarjs/pseudo-random": "off",
        "typescript/consistent-return": "off",
        "typescript/consistent-type-definitions": "off",
        "typescript/no-confusing-void-expression": "off",
        "typescript/no-deprecated": "off",
        "typescript/no-unsafe-argument": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-type-assertion": "off",
        "typescript/prefer-nullish-coalescing": "off",
        "typescript/promise-function-async": "off",
        "typescript/restrict-template-expressions": "off",
        "typescript/strict-boolean-expressions": "off",
        "unicorn/no-document-cookie": "off",
      },
    },
  ],
});
