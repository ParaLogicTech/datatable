<div align="center" markdown="1">

<img width="80" alt="datatable-logo" src="https://github.com/user-attachments/assets/8235f4b9-993a-4329-97de-9431dcf63aae" >

<h1>Frappe DataTable</h1>

**A modern datatable library for the web**

[![Test and Release](https://github.com/ParaLogicTech/datatable/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/ParaLogicTech/datatable/actions/workflows/test-and-release.yml)
[![npm version](https://img.shields.io/npm/v/@paralogic/frappe-datatable.svg)](https://www.npmjs.com/package/@paralogic/frappe-datatable)

> ParaLogic's fork of [frappe/datatable](https://github.com/frappe/datatable), published as `@paralogic/frappe-datatable`. See [Fork additions](#fork-additions).


https://github.com/user-attachments/assets/86b37ba6-6f7a-4996-ac63-23407793bec3

</div>

## Frappe Datatable

Frappe DataTable is a simple, modern and interactive datatable library for displaying tabular data. Originally built for [ERPNext](https://github.com/frappe/erpnext), it can be used to render large amount of rows without sacrificing performance and has the basic data grid features like inline editing and keyboard navigation. It does not require jQuery, unlike most data grids out there.

### Motivation

I was trying to remove all legacy UI components from the [frappe](https://github.com/frappe/frappe) codebase. We were using [SlickGrid](https://github.com/mleibman/SlickGrid) for rendering tables. It was unmaintained and UI was dated. Other datatable solutions either didn't have the features we needed or were closed source. So we built our own.


### Key Features

- **Cell**: Enable editing within individual cells and features like custom formatters, inline editing, and mouse selection. Users can easily copy cell content, navigate through cells using the keyboard, and take advantage of a custom cell editor for advanced functionality.
- **Column**: Columns are highly flexible, allowing users to reorder, resize, and sort them with ease. Additional features include hiding/removing columns and adding custom actions.
  - Freeze a column from its header menu so it stays in view while scrolling sideways, or set `sticky: true` on the column.
  - Column widths fit the widest value in all rows, and widths a user resized are kept when the data refreshes.
  - Set `sortValue` on a column to sort on a value other than the cell content.
- **Row**: Rows support advanced interactions, including row selection, tree-structured organization, and inline filters for precise control. They handle large datasets efficiently with dynamic row heights.
  - In tree view, sorting keeps child rows under their parent.
  - Total rows (`is_total_row`) and blank rows keep their place when the table is sorted.
- **Options**: `serialNoColumnLabel` sets the header of the serial number column. `saveSorting` remembers the last sort in local storage, under `sortingKey` when it is set.
- **Fuzzy filter**: set `filterMode: 'fuzzy'` on the table, or on a single column, so an inline filter matches letters typed in order with gaps allowed (`jdmr` finds "Jordan Moreau"). Each word matches on its own, in any order, and a word of four or more letters may have one typo (`saftware` finds "Software"). Number filters such as `>100` work as before.


### Fork additions

- **Grouped data**: pass `{ _isGroup: true, rows: [...] }` objects in `data`. They can be nested.
  - With `totals: {...}`, the group renders as a tree: a group-total row with its rows indented under it.
  - Without `totals`, the group renders as a flat list, with a blank row between groups.
- **`getData(rowIndex)`** returns the original row object, also for rows that came from a group.
- **`_excludeFromTotal: true`** on a row object leaves it out of the total row and of `hooks.columnTotal`. Group-total rows set it automatically.
- Keyboard navigation, scrolling and focus fixes, plus extra null checks for custom editors and selection.

## Usage

```bash
yarn add @paralogic/frappe-datatable
# or
npm install @paralogic/frappe-datatable
```

> Note: [`sortablejs`](https://github.com/RubaXa/Sortable) is required to be installed as well.


```js
import DataTable from '@paralogic/frappe-datatable';

const datatable = new DataTable('#datatable', {
  columns: [ 'First Name', 'Last Name', 'Position' ],
  data: [
    [ 'Don', 'Joe', 'Designer' ],
    [ 'Mary', 'Jane', 'Software Developer' ]
  ]
});
```

## Browser Support

DataTable works in current versions of Chrome, Edge, Firefox and Safari. Internet Explorer is not supported: the build ships ES2015 classes and arrow functions, and the styles use CSS custom properties.

## Development Setup

* `yarn start` - Start dev server
* Open `index.html` located in the root folder, and start development.
* Run `yarn lint` before committing changes
* `yarn test` - Run the Playwright tests against `index.html` (run `yarn build` first, and `yarn playwright install chromium` once)
* This project uses [commitizen](https://github.com/commitizen/cz-cli) for conventional commit messages, use `yarn commit` command instead of `git commit`
* Releases are manual: run the **Test and Release** workflow on `master`. Leave `version` blank to let semantic-release compute it from the commit messages (`fix:` → patch, `feat:` → minor), or give an exact version. `dry_run` is on by default. See `CLAUDE.md` for details.

## Links

- [Making a new datatable for the web](https://medium.com/frapp%C3%A9-thoughts/things-i-learned-building-a-library-for-the-web-6846a588bf53)

<br>
<br>
<div align="center" style="padding-top: 0.75rem;">
	<a href="https://frappe.io" target="_blank">
		<picture>
			<source media="(prefers-color-scheme: dark)" srcset="https://frappe.io/files/Frappe-white.png">
			<img src="https://frappe.io/files/Frappe-black.png" alt="Frappe Technologies" height="28"/>
		</picture>
	</a>
</div>
