# Plan 001: Prune unused vendored shadcn primitives and their orphaned dependencies

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2315563..HEAD -- components/ui package.json tsconfig.json AGENTS.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `2315563`, 2026-06-12

## Why this matters

`components/ui/` holds 55 shadcn-scaffolded primitives, but only 20 are ever
imported by app code. The other 35 are dead vendor files, and eight runtime
dependencies in `package.json` exist *only* to serve them (`recharts`,
`react-day-picker`, `date-fns`, `embla-carousel-react`, `cmdk`, `vaul`,
`input-otp`, `react-resizable-panels`). Two more entries are misplaced dev
tools listed as runtime dependencies (`shadcn` — a CLI — and
`@remotion/eslint-plugin`). One dead file, `components/ui/calendar.tsx`, is so
broken against the installed `react-day-picker` v10 that it is excluded from
typecheck in `tsconfig.json` — a standing blind spot.

To be precise about the payoff: none of this code reaches the browser bundle
(unimported modules are never bundled by Next). The wins are: a smaller
dependency/audit surface (`bun audit` noise currently includes `recharts`'
tree), faster installs, removal of the typecheck exclusion, and a vendor
directory that reflects what the app actually uses. All deleted primitives can
be re-added at any time with `bunx shadcn add <name>`.

## Current state

- `components/ui/` — vendored shadcn primitives. AGENTS.md marks this folder
  "VENDOR — do NOT edit; re-add via `bunx shadcn add`". Deleting unused files
  is not "editing" a primitive, but it is a deviation worth one line in the
  commit message.
- Verified import analysis (at commit `2315563`): the **only** ui files
  imported from `app/`, `components/app/`, `components/themes/`, `lib/`,
  `hooks/`, `.storybook/`, `e2e/`, `remotion/`, `scripts/` are:

  ```
  alert badge button card checkbox dialog input item label pagination
  select skeleton slider sonner spinner switch toggle toggle-group tooltip
  ```

  plus `separator`, which is imported *by* `components/ui/item.tsx`. That is
  the 20-file KEEP set. Intra-ui imports of the keep set are only:
  `dialog → button`, `item → separator`, `pagination → button`,
  `toggle-group → toggle`. (`sonner.tsx` imports the `next-themes` package —
  `next-themes` therefore STAYS in dependencies.)
- The 35-file DELETE set (everything else in `components/ui/`):

  ```
  accordion alert-dialog aspect-ratio avatar breadcrumb button-group calendar
  carousel chart collapsible combobox command context-menu direction drawer
  dropdown-menu empty field hover-card input-group input-otp kbd menubar
  native-select navigation-menu popover progress radio-group resizable
  scroll-area sheet sidebar table tabs textarea
  ```

- Dependencies that become orphaned once those files are gone (each verified
  to have zero imports outside the DELETE set):
  - `recharts` → only `components/ui/chart.tsx`
  - `react-day-picker` → only `components/ui/calendar.tsx`
  - `date-fns` → zero direct imports anywhere; it is `react-day-picker`'s peer
  - `embla-carousel-react` → only `components/ui/carousel.tsx` (the app's
    carousel editor uses CSS scroll-snap, not embla)
  - `cmdk` → only `components/ui/command.tsx`
  - `vaul` → only `components/ui/drawer.tsx`
  - `input-otp` → only `components/ui/input-otp.tsx`
  - `react-resizable-panels` → only `components/ui/resizable.tsx`
- Misplaced dev tools in `dependencies` (`package.json`):
  - `"shadcn": "^4.11.0"` — the scaffolding CLI, never imported at runtime
  - `"@remotion/eslint-plugin": "^4.0.475"` — referenced only by lint config
- `tsconfig.json` excludes the broken calendar:

  ```jsonc
  // tsconfig.json (end of file)
  "exclude": ["node_modules", "components/ui/calendar.tsx"]
  ```

- `AGENTS.md` § "Vendor files" documents that exclusion:
  > `components/ui/calendar.tsx` is additionally excluded from `bun typecheck`
  > (see `tsconfig.json`) — it ships against `react-day-picker` v9 but v10 is
  > installed.
- Do NOT touch: `@base-ui/react` (used by kept primitives: button, checkbox,
  dialog, select, switch, tooltip, etc.), `next-themes` (used by kept
  `sonner.tsx`), `@remotion/cli` / `@remotion/player` / `remotion` (the intro
  video uses the player at runtime; Remotion recommends keeping all
  `@remotion/*` packages on identical exact versions — leave their pins
  alone), and the `ignoreScripts` / `trustedDependencies` blocks in
  package.json (`sharp` and `unrs-resolver` ARE present transitively in
  `bun.lock`; that config is load-bearing for `bun install` behavior).

## Commands you will need

| Purpose    | Command                    | Expected on success |
|------------|----------------------------|---------------------|
| Install    | `bun install`              | exit 0, lockfile updated |
| Lint       | `bun lint`                 | exit 0              |
| Typecheck  | `bun typecheck`            | exit 0, no errors   |
| Unit tests | `bun run test`             | all pass            |
| Build      | `bun run build`            | exit 0              |
| Storybook  | `bun run build-storybook`  | exit 0              |

## Scope

**In scope** (the only files you should modify/delete):
- The 35 files in the DELETE set under `components/ui/`
- `package.json` (dependency removals + the two devDependency moves)
- `bun.lock` (regenerated by `bun install`)
- `tsconfig.json` (remove the calendar exclusion)
- `AGENTS.md` (remove the now-stale calendar.tsx sentence)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):
- The 20 KEEP files in `components/ui/` — no edits, no "while I'm here" cleanup
- `components.json`, `eslint.config.mts`, `biome.jsonc` — their components/ui
  carve-outs stay valid for the kept files
- `hooks/use-mobile.ts` — vendor, used or not, explicitly protected by AGENTS.md
- Any `@remotion/*` version change
- `ignoreScripts` / `trustedDependencies` in package.json

## Git workflow

- Work on the current branch unless the operator says otherwise.
- Conventional Commits, matching repo history (e.g. `277a24f feat(themes): …`).
  Suggested: `chore(deps): prune unused shadcn primitives and orphaned deps`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-verify the import analysis (cheap insurance)

Run, from the repo root:

```bash
for f in components/ui/*.tsx; do
  name=$(basename "$f" .tsx)
  hits=$(grep -rl "components/ui/$name\"" app components lib hooks e2e remotion scripts .storybook --include='*.ts*' | grep -v "^components/ui/" | head -1)
  echo "$name => ${hits:-UNUSED}"
done
```

**Verify**: the UNUSED list matches the 35-file DELETE set above, and every
KEEP-set file shows at least one hit (separator's hit is `components/ui/item.tsx`,
which the `grep -v` filters — confirm it separately with
`grep -rn "ui/separator" components/ui/item.tsx` → one match). If any file in
the DELETE set now has an importer, remove it from the DELETE set, keep its
dependency, and note the deviation in your report.

### Step 2: Delete the 35 unused primitives

`git rm` each file in the DELETE set.

**Verify**: `ls components/ui | wc -l` → `20`.

### Step 3: Remove orphaned dependencies and fix placement

In `package.json`:
1. Delete from `dependencies`: `recharts`, `react-day-picker`, `date-fns`,
   `embla-carousel-react`, `cmdk`, `vaul`, `input-otp`,
   `react-resizable-panels`.
2. Move `shadcn` and `@remotion/eslint-plugin` from `dependencies` to
   `devDependencies` (keep their version ranges as-is).
3. Run `bun install` to regenerate `bun.lock`.

**Verify**: `bun install` exits 0, and
`grep -E '"(recharts|react-day-picker|date-fns|embla-carousel-react|cmdk|vaul|input-otp|react-resizable-panels)"' package.json` → no matches.

### Step 4: Drop the calendar typecheck exclusion

In `tsconfig.json`, change the exclude array to `"exclude": ["node_modules"]`.
In `AGENTS.md`, delete the sentence beginning
"`components/ui/calendar.tsx` is additionally excluded from `bun typecheck`"
(keep the rest of the Vendor files paragraph intact).

**Verify**: `grep -n "calendar" tsconfig.json AGENTS.md` → no matches.

### Step 5: Full verification gate

```bash
bun lint && bun typecheck && bun run test && bun run build && bun run build-storybook
```

**Verify**: every command exits 0. If `bun lint` complains about
`@remotion/eslint-plugin` resolution after the move, confirm
`eslint.config.mts` still resolves it (devDependencies are installed by
`bun install` — a failure here means something else is wrong; STOP).

## Test plan

No new tests — this plan removes only files with zero inbound imports, so the
existing gates are the regression net: unit suite (`bun run test`), production
build, and the Storybook compile-all-stories build. All three must pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ls components/ui | wc -l` → 20
- [ ] `grep -E '"(recharts|react-day-picker|date-fns|embla-carousel-react|cmdk|vaul|input-otp|react-resizable-panels)"' package.json` → no output
- [ ] `shadcn` and `@remotion/eslint-plugin` appear under `devDependencies`, not `dependencies`
- [ ] `grep -n "calendar" tsconfig.json` → no output
- [ ] `bun lint && bun typecheck && bun run test && bun run build && bun run build-storybook` all exit 0
- [ ] `git status` shows no modifications outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 finds an importer for any DELETE-set file that isn't itself in the
  DELETE set.
- `bun typecheck` fails after Step 4 with errors in any file OTHER than a
  deleted one (would mean the calendar exclusion was masking something else).
- `bun run build` or `bun run build-storybook` fails referencing a deleted
  module — find the importer; if it's a file this plan says is out of scope,
  STOP rather than restoring or editing.
- `bun install` cannot reach the registry (this environment may be
  network-restricted) — report it; do not hand-edit `bun.lock`.

## Maintenance notes

- Re-adding any pruned primitive later is one command:
  `bunx shadcn add <name>` (it will also re-add the matching dependency).
- Reviewer should scrutinize: the `bun.lock` diff (should only *remove*
  entries), and that no kept primitive lost a transitive helper.
- Deferred deliberately: the `ignoreScripts`/`trustedDependencies` oddity in
  package.json (sharp/unrs-resolver are real transitive deps; touching that
  block risks changing install behavior for zero payoff).
