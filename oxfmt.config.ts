// Formatting is oxfmt with Ultracite's shared preset — the same 80-column,
// double-quoted, sorted-imports style the repo already used, plus Tailwind
// class sorting for `cn()` and friends.
import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Ultracite reflows Markdown onto single lines. The prose in this repo
  // (AGENTS.md, SPEC.md, docs/, the skills) is hard-wrapped on purpose so
  // diffs stay line-sized — keep the authored wrapping.
  proseWrap: "preserve",
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    // Vendored agent skills installed via `npx skills add` and pinned by
    // skills-lock.json, plus local agent state. Third-party or machine-owned —
    // re-add/update, don't reformat.
    "**/.agents",
    "**/.claude/projects",
    "**/skills",
    // Generated, gitignored test artifacts.
    "**/playwright-report",
    "**/test-results",
  ],
});
