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
yarn test             # Playwright (playwright/tests/) against index.html on :8989 (needs a build first)
yarn test:ui          # Playwright UI mode
```

- `dist/` is gitignored. Run `yarn build` or `yarn dev` before opening `index.html` or running the tests.
- First-time Playwright setup: `yarn playwright install chromium`.
- `index.html` at the repo root is the manual playground and the page the tests load. Serve it with `npx http-server -p 8989` and open http://localhost:8989.
- ESLint also runs as a rollup plugin, so lint errors break the build.
- `playwright/tests/fork_features.spec.js` covers the fork-only features: groups, `getData`/`flatData`, `_excludeFromTotal`, tree sorting and shift+arrow. Add to it when changing fork behaviour.
- `test/*.spec.js` are upstream's old mocha specs. No script runs them, but keep them because they exist upstream.

## Build and release

Releases happen automatically on every push to `master`, through `.github/workflows/test-and-release.yml`:

1. `yarn lint-and-build` writes `dist/` on the runner. It is never committed.
2. Playwright runs the tests.
3. `yarn semantic-release` uses `.releaserc.json` and the default plugins:
   - It derives the next version from conventional commits since the last `pl-v*` tag.
   - It sets that version in `package.json` on the runner and runs `npm publish`. `"files": ["dist","src"]` ships the built `dist/`, and `publishConfig.access` is `public`.
   - It pushes a `pl-vX.Y.Z` tag and creates a GitHub release.

PRs run lint, build and tests only (`test-pull-request.yml`).

**Publishing an exact version** (fork-only): the same workflow has a manual `workflow_dispatch` trigger with a `version` input. On `master`, it runs lint, build and tests, then publishes that exact version instead of running semantic-release.
- Before publishing, it checks that the version is `X.Y.Z` and isn't on npm yet.
- It creates and pushes `pl-v<version>`, unless that tag already exists in `master`'s history. It runs `npm publish` through trusted publishing and creates the GitHub release.
- Trigger it from the Actions tab, or with:

```bash
gh workflow run test-and-release.yml -R ParaLogicTech/datatable --ref master -f version=X.Y.Z
```

The manual trigger has to stay in `test-and-release.yml`, because the npm trusted publisher only accepts that workflow file.

Rules that follow from this:

- **Commit messages must be conventional.** `fix:` gives a patch, `feat:` a minor, and `BREAKING CHANGE:` in the footer a major. Anything else (`chore:`, `docs:`, `test:`, `ci:`, bare messages like `1.20.7`) publishes nothing. `yarn commit` runs commitizen.
- **Merge PRs with "Create a merge commit".** A squash merge replaces the conventional commit messages with the PR title, so nothing gets published. Squash and rebase merges also drop upstream merge commits.
- **Don't bump `version` in `package.json`.** It stays `0.0.0-development` and semantic-release sets the real version on the runner. Because of that, the bundled `DataTable.__version__` reads `0.0.0-development`. Upstream has the same behaviour.
- **Fork tags are `pl-v${version}`, not `v${version}`.** Upstream's `v*` tags (fetched from the `frappe` remote) already include `v1.20.6`, `v1.20.7` and `v1.21.x` on unrelated commits. Never push upstream's tags to `origin` (no `git push --tags`).
- **Never delete the latest `pl-v*` tag.** `pl-v1.20.7` (`b7160fa`) was the baseline for the last manual release, and `pl-v1.20.8` was the first CI release. Without a `pl-v*` tag reachable from `master`, semantic-release treats the next run as the first release and publishes **1.0.0** as `latest`.
- npm auth uses trusted publishing (OIDC, `id-token: write`). The trusted publisher on npmjs.com points at `ParaLogicTech/datatable`, workflow `test-and-release.yml`, with no environment. If you rename the workflow file, update it there too.
- **Versions follow upstream's.** Earlier the fork had its own line (1.17.x for v14, up to 1.20.8 for v15). From the 1.27.1 upstream merge on, each upstream merge is released as upstream's version at the merge point. Fork-only `fix:`/`feat:` commits between merges are released by semantic-release as usual (e.g. 1.27.2). semantic-release can't set an exact version, so upstream merges go like this:
  1. On the merge branch (open PR), look up upstream's release at the merged commit with `git describe --tags --match 'v*' frappe/master`, e.g. `v1.27.1`.
  2. **Before merging the PR**, push `pl-v<that version>` on the branch's merge commit (`git tag pl-v1.27.1 <merge-commit> && git push origin pl-v1.27.1`). The push to `master` then finds no releasable commits after the tag, and semantic-release publishes nothing. Without the tag it publishes a semantic bump (e.g. 1.21.0) that can't be undone.
  3. Merge the PR with "Create a merge commit".
  4. Run the manual publish (above) with `version=1.27.1`. It sees the existing tag in `master`'s history and publishes.
  - If upstream's merged commit isn't exactly a release (it's past its latest `v*` tag), use the next patch of upstream's latest tag, or agree on a version with the user.

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
- **Totals.** Rows with `_excludeFromTotal` (`meta.excludeFromTotal`) are skipped by both the `hooks.columnTotal` input and the default sum. This is applied in `body-renderer.js` `getTotalRow()`, alongside upstream's `isTotalRow` filter. Group-total rows set it automatically. Object rows with `is_total_row` get `meta.isTotalRow` (upstream).
- **Sorting** is upstream's `_sortTreeRows`. It keeps the hierarchy in `treeView` and keeps empty rows and `is_total_row` rows in place, which also covers the fork's list-view padding rows. The fork's own `treeSort` was dropped in the 1.27.1 upstream merge.
- **`this.hooks`** on the instance, built from `options.hooks` and `options.events`.
- **Keyboard and focus.** The wrapper gets `tabIndex = 0`. `focusCell(..., skipDOMFocus)` focuses the wrapper so keyboard navigation keeps working. Arrow keys and area selection are ignored while a cell is being edited. Shift+arrow is null-guarded. `scrollToCell` calls `scrollIntoView({block:'nearest'})` and then `focus()`.
- **Scrolling.** `$.scrollTop` is synchronous (no rAF). `rowmanager.scrollToRow` is upstream's version since the 1.27.1 merge, which covers the fork's old fix.
- **Robustness.** Cell editors may return a falsy value from `getValue()`. Selection and highlight code null-checks `$cell`. `style.js` tolerates a missing `cssRules`. `$.measureTextWidth` renders off-screen.
- **Layout.** The window-resize handler is bound for every layout, not only `fluid`. Header cell content has no `padding-right`, so upstream's header-checkbox padding override was dropped too. Everything else uses upstream's frappe-ui default styles (`--dt-*` colours, header `font-weight: 500`).

## Merging upstream

- The last merge was frappe/master `7c27012` (upstream `v1.27.1`), released as 1.27.1. That merge brought in Playwright tests (replacing Cypress), frappe-ui default styles, sticky columns, fuzzy and exact text filters, column auto-width, `column.sortValue` and tree-aware sorting.
- Release the merge with upstream's version; see "Versions follow upstream's" above.
- Conflict hot spots:
  - `datamanager.js`: `prepareRows`/`addObjectRow` (the fork's group handling versus upstream's inline object-row code)
  - `body-renderer.js`: `getTotalRow`
  - `style.css`: header content padding
  - `cellmanager.js`: focus and editing guards
  - `style.js`: `bindResizeWindow`
  - `filterRows.js`: `getFormattedValue`
  - `.github/workflows/test-and-release.yml`: keep the fork's `workflow_dispatch` exact-version publish
  - `README.md`: the fork's badges, install instructions and "Fork additions"
  - `package.json`: name, repo URLs, `publishConfig`, version
- Keep `.releaserc.json` (the `pl-v` tagFormat).
- `yarn test` includes `fork_features.spec.js`. If it fails after a merge, a fork feature was lost in conflict resolution. Ideally also test in the v15 bench query reports (grouped and tree reports, totals row, keyboard navigation).
