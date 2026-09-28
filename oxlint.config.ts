/**
 * oxlint (`--type-aware`, via oxlint-tsgolint) with the Ultracite presets and
 * the framework plugins' own recommended sets — taken as shipped, no rule
 * tweaks. When a rule fires, change the code; a single line that genuinely
 * cannot comply gets `oxlint-disable-next-line <rule> -- <reason>`.
 *
 * The sonarjs and github plugins need the TypeScript compiler API, which TS 7
 * no longer ships — see the TypeScript note in AGENTS.md.
 */
import remotion from "@remotion/eslint-plugin";
import { configs as storybookConfigs } from "eslint-plugin-storybook";
import { defineConfig } from "oxlint";
import type { DummyRule, DummyRuleMap, OxlintOverride } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import jest from "ultracite/oxlint/jest";
import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";

/** A plugin preset's own rules — the entries for other plugins (it switches
 *  off `react-hooks` / `import-x` rules oxlint doesn't load) dropped. */
const ownRules = (
  plugin: string,
  rules: Readonly<Partial<Record<string, DummyRule>>> = {}
): DummyRuleMap => {
  const own: DummyRuleMap = {};
  for (const [rule, entry] of Object.entries(rules)) {
    if (rule.startsWith(plugin) && entry !== undefined) {
      own[rule] = entry;
    }
  }
  return own;
};

/** eslint-plugin-storybook's recommended + csf-strict flat sets, with the
 *  file globs they ship (stories, and `.storybook/main`). */
const storybookOverrides: OxlintOverride[] = [];
for (const { files, rules } of [
  ...storybookConfigs["flat/recommended"],
  ...storybookConfigs["flat/csf-strict"],
]) {
  if (files !== undefined) {
    storybookOverrides.push({
      // The plugin ships extglobs (`*.stories.@(ts|tsx)`); oxlint's globs
      // take brace alternation (`*.stories.{ts,tsx}`).
      files: files
        .flat()
        .map((glob) =>
          glob.replaceAll("@(", "{").replaceAll("|", ",").replaceAll(")", "}")
        ),
      rules: ownRules("storybook/", rules),
    });
  }
}

export default defineConfig({
  extends: [core, react, next, jest, jsPlugins, nextJsPlugins, antiSlop],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // Generated or vendored — re-scaffolded, never hand-edited (AGENTS.md):
    // shadcn primitives, agent skills, test reports.
    "components/ui/**",
    "hooks/use-mobile.ts",
    "**/skills",
    "**/playwright-report",
    "**/test-results",
  ],
  jsPlugins: [
    ...(jsPlugins.jsPlugins ?? []),
    ...(antiSlop.jsPlugins ?? []),
    ...(shadcn.jsPlugins ?? []),
    { name: "storybook", specifier: "eslint-plugin-storybook" },
    { name: "@remotion", specifier: "@remotion/eslint-plugin" },
  ],
  overrides: [
    ...storybookOverrides,
    { files: ["remotion/**"], rules: remotion.configs.recommended.rules },
    // shadcn/lint enforces the design system on app UI. Theme canvases and
    // Remotion frames are not design-system UI (pixel-exact, inline-styled
    // output), so the preset is scoped to the UI rather than extended globally.
    {
      files: [
        "app/**",
        "components/app/**",
        "theme/editor/**",
        ".storybook/**",
      ],
      rules: shadcn.rules,
    },
    // Our own styled wrappers over components/ui get the exemptions the
    // shadcn preset ships for components/ui — a component owns its look.
    ...(shadcn.overrides ?? []).map((override) => ({
      ...override,
      files: ["components/app/primitives/**"],
    })),
    {
      // Next.js dispatches Route Handlers by their HTTP-verb name (`GET`).
      files: ["app/**/route.ts"],
      rules: { "sonarjs/function-name": "off" },
    },
  ],
  // oxlint does not merge `settings` from extended configs.
  settings: jsPluginSettings,
});
