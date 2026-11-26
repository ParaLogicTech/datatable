# CLAUDE.md

This is ParaLogic's fork of [frappe/datatable](https://github.com/frappe/datatable), published to npm as **`@paralogic/frappe-datatable`**. It carries fixes and features that the ParaLogic Frappe/ERPNext benches rely on. Build and release follow upstream's CI model (semantic-release on push to `master`), with fork-specific tags (see below).

## Working rules

- **Don't stage, commit or push without the user's review.** Make changes in the working tree and show the diff. Each step (stage, commit, push, history rewrite) needs an explicit go-ahead.
- **Don't delete files that still exist upstream** (`git show frappe/master:<path>`), even dead ones such as `test/` mocha specs. Deleting them only causes modify/delete conflicts on later merges. Only fork-only code is fair game for cleanup.

## Remotes and consumers

- `origin`: `git@github.com:ParaLogicTech/datatable.git`. The default branch is `master`.
- `frappe`: `https://github.com/frappe/datatable.git`, upstream. Merged in from time to time.
- Consumers (sibling benches under `~/erpnext/`):
  - `paralogic_v15/apps/frappe/package.json` → `"@paralogic/frappe-datatable": "^1.20.x"` (the main target)
  - `paralogic_v14`, `sundine_v14` → `^1.17.6` (older 1.17.x line)
  - `frappe_v15` uses stock upstream `frappe-datatable`, which is not this package.
- How frappe uses it:
  - JS: `import DataTable from "@paralogic/frappe-datatable"` in `frappe/public/js/frappe/ui/datatable.js`, `views/reports/query_report.js`, `views/reports/report_view.js` and `data_import/import_preview.js`. This goes through `main`, which is **`dist/frappe-datatable.cjs.js`**.
  - CSS: `@import "~@paralogic/frappe-datatable/dist/frappe-datatable"` in `report.bundle.scss` and `web_form.bundle.scss`. This uses the **non-minified** `dist/frappe-datatable.css`.
  - The `.min.js` and `.min.css` files are not used by frappe.

## Commands

```bash
yarn install          # deps (yarn v1, lockfile committed)
yarn dev              # rollup watch → dist/frappe-datatable.{js,cjs.js,css}
yarn lint             # eslint src (4-space indent, max-len 120)
yarn build            # dev bundles, then NODE_ENV=production for the .min files
yarn test             # Cypress (cypress/integration/) against index.html on :8989 (needs a build first)
yarn test-local       # Cypress interactive runner
```

- `dist/` is gitignored. Run `yarn build` or `yarn dev` before opening `index.html` or running the tests.
- `index.html` at the repo root is the manual playground and the page the tests load. Serve it with `yarn cy:server` and open http://localhost:8989.
- ESLint also runs as a rollup plugin, so lint errors break the build.
- `cypress/integration/fork_features.js` covers the fork-only features: groups, `getData`/`flatData`, `_excludeFromTotal`, tree sorting and shift+arrow. Add to it when changing fork behaviour.
- `test/*.spec.js` are upstream's old mocha specs. No script runs them, but keep them because they exist upstream.

## Build and release

Releases happen automatically on every push to `master`, through `.github/workflows/test-and-release.yml`:

1. `yarn lint-and-build` writes `dist/` on the runner. It is never committed.
2. Cypress runs the tests.
3. `yarn semantic-release` uses `.releaserc.json` and the default plugins:
   - It derives the next version from conventional commits since the last `pl-v*` tag.
   - It sets that version in `package.json` on the runner and runs `npm publish`. `"files": ["dist","src"]` ships the built `dist/`, and `publishConfig.access` is `public`.
   - It pushes a `pl-vX.Y.Z` tag and creates a GitHub release.

PRs run lint, build and tests only (`test-pull-request.yml`).

Rules that follow from this:

- **Commit messages must be conventional.** `fix:` gives a patch, `feat:` a minor, and `BREAKING CHANGE:` in the footer a major. Anything else (`chore:`, `docs:`, `test:`, `ci:`, bare messages like `1.20.7`) publishes nothing. `yarn commit` runs commitizen.
- **Merge PRs with "Create a merge commit".** A squash merge replaces the conventional commit messages with the PR title, so nothing gets published. Squash and rebase merges also drop upstream merge commits.
- **Don't bump `version` in `package.json`.** It stays `0.0.0-development` and semantic-release sets the real version on the runner. Because of that, the bundled `DataTable.__version__` reads `0.0.0-development`. Upstream has the same behaviour.
- **Fork tags are `pl-v${version}`, not `v${version}`.** Upstream's `v*` tags (fetched from the `frappe` remote) already include `v1.20.6`, `v1.20.7` and `v1.21.x` on unrelated commits. Never push upstream's tags to `origin` (no `git push --tags`).
- **Never delete the latest `pl-v*` tag.** `pl-v1.20.7` marks `b7160fa`, the last manual release. Without a `pl-v*` tag reachable from `master`, semantic-release treats the next run as the first release and publishes **1.0.0** as `latest`.
- npm auth uses trusted publishing (OIDC, `id-token: write`). The trusted publisher on npmjs.com points at `ParaLogicTech/datatable`, workflow `test-and-release.yml`, with no environment. If you rename the workflow file, update it there too.
- **Versions should follow upstream's.** Until now the fork had its own line (1.17.x for v14, 1.20.x for v15). From the next upstream merge on, the fork's release should carry upstream's version at the merge point (for example, merging upstream `v1.27.1` publishes 1.27.1). Fork-only fixes in between bump the patch.
  - semantic-release can't do this on its own: it bumps from the last `pl-v*` tag, so the merge would publish 1.21.0.
  - Tagging the merge commit `pl-v1.27.1` before pushing suppresses the release entirely (no commits after the tag).
  - The mechanism is still to be decided at merge time. Options: a one-off manual release, or a custom step that reads upstream's latest `v*` tag.

After a release, in `paralogic_v15/apps/frappe`:

1. Bump the `@paralogic/frappe-datatable` range in `package.json` if needed.
2. Run `yarn` to refresh the lockfile.
3. Run `bench build --app frappe`.

To test against a bench before releasing, run `yarn build`. Then copy `dist/` and `src/` into `paralogic_v15/apps/frappe/node_modules/@paralogic/frappe-datatable/`, or `yarn link` the package. Then run `bench build --app frappe`.

To check what the next release would be (on `master`, publishes nothing):

```bash
npx semantic-release --dry-run --no-ci -r git@github.com:ParaLogicTech/datatable.git --plugins @semantic-release/commit-analyzer
```

## Gotchas

- **Never use destructuring assignment into member expressions** in `src/`, for example `[this.a, this.b] = f()`. `uglify-es@3.0.3` (via `rollup-plugin-uglify-es@0.0.1`) crashes on it with `TypeError: Cannot read properties of undefined (reading 'length')`. That breaks the production build, which fails CI and blocks the release. Destructure into locals and assign them afterwards. Destructuring declarations like `const [a, b] = f()` are fine.

## Architecture (src/)

- `datatable.js` is the `DataTable` class. It merges options, builds the DOM and wires up the managers below.
- `datamanager.js` holds rows, columns, sorting, tree structure and filtering data. `rowmanager.js` handles rows, tree expand/collapse, checkboxes and `scrollToRow`. `cellmanager.js` handles focus, selection, editing, keyboard navigation and copy. `columnmanager.js` handles header, sort, resize, reorder and the column dropdown. `body-renderer.js` renders the body with HyperList virtualization and draws the totals row. `style.js` handles dynamic CSS rules, column widths, window resize and sticky columns. `filterRows.js` handles inline filters. `keyboard.js`, `dom.js` (`$` helpers), `utils.js`, `translationmanager.js` and `translations/` are the remaining helpers.
- `style.css` and `dark.css` are processed by postcss (nested, custom properties, autoprefixer) into `dist/frappe-datatable.css`.
- External at runtime: `sortablejs`. `lodash` and `hyperlist` are bundled.

## What the fork adds or changes vs upstream

Paralogic_v15 code depends on these, so keep them when merging upstream:

- **Group/nested data.** `prepareRows` returns `[rows, flatData]`. Row objects with `_isGroup` expand recursively via `addGroupObject`:
  - If a group has `totals`, it renders as a tree with a group-total row and indented children.
  - Otherwise it renders as a list with blank padding rows between groups.
- **`flatData` and `getData(rowIndex)`.** `getData` returns `this.flatData[rowIndex]`, the original row object after group flattening, instead of `this.data[rowIndex]`. `appendRows` keeps it in sync. `filterRows.js` passes `allData.getData(rowIndex)` to formatters.
- **Totals.** Rows with `_excludeFromTotal` (`meta.excludeFromTotal`) are skipped by both the `hooks.columnTotal` input and the default sum in `body-renderer.js`. Group-total rows set it automatically.
- **Tree-aware sorting.** When `treeView` is on, `_sortRows` → `treeSort` sorts siblings within each parent and keeps the hierarchy. Sorting always does a full sort; upstream's reverse-on-toggle shortcut was dropped. The comparison logic lives in `compareContent`.
- **`this.hooks`** on the instance, built from `options.hooks` and `options.events`.
- **Keyboard and focus.** The wrapper gets `tabIndex = 0`. `focusCell(..., skipDOMFocus)` focuses the wrapper so keyboard navigation keeps working. Arrow keys and area selection are ignored while a cell is being edited. Shift+arrow is null-guarded. `scrollToCell` calls `scrollIntoView({block:'nearest'})` and then `focus()`.
- **Scrolling.** `rowmanager.scrollToRow` uses `$.inVerticalViewport` and computes the offset from real row positions, clamped. `$.scrollTop` is synchronous (no rAF).
- **Robustness.** Cell editors may return a falsy value from `getValue()`. Selection and highlight code null-checks `$cell`. `style.js` tolerates a missing `cssRules`. `$.measureTextWidth` renders off-screen.
- **Layout.** The window-resize handler is bound for every layout, not only `fluid`. Header cell content has no `padding-right`.

## Merging upstream

- The last merge was `b70e533`, with merge-base `cd5b3ba` (2026-06-13). Upstream has moved on since then: about 70 commits, Cypress replaced by Playwright, frappe-ui default styles, fuzzy and exact filters, column auto-width, `column.sortValue` and its own tree-aware sorting (`_sortTreeRows`).
- The branch `upstream-merge` on `origin` (closed PR #5) has a worked-out merge of frappe/master `7c27012` that can be reused. Its resolutions:
  - Upstream's sorting replaces `treeSort`.
  - Upstream's `scrollToRow` replaces the fork's.
  - `is_total_row` handling is added to `addObjectRow`.
  - `excludeFromTotal` is added to upstream's total-row filter.
  - The fork's zero header padding is kept.
  - Upstream's Playwright workflows are taken. `fork_features.js` then needs porting to Playwright.
- Conflict hot spots:
  - `datamanager.js`: `prepareRows`, `_sortRows`, `getData`
  - `rowmanager.js`: `scrollToRow`
  - `body-renderer.js`: `getTotalRow`
  - `style.css`: header padding
  - `cellmanager.js`: focus and editing guards
  - `style.js`: `bindResizeWindow`
  - `filterRows.js`: `getFormattedValue`
  - `package.json`: name, repo URLs, `publishConfig`, version
  - `.gitignore`: keep `dist` ignored
- Keep `.releaserc.json` (the `pl-v` tagFormat).
- Merge commits aren't conventional, but semantic-release still counts the upstream `fix:`/`feat:` commits that come with them. Expect a release when the merge reaches `master`.
