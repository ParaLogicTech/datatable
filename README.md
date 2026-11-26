<div align="center" markdown="1">

<img width="80" alt="datatable-logo" src="https://github.com/user-attachments/assets/8235f4b9-993a-4329-97de-9431dcf63aae" >

<h1>Frappe DataTable</h1>

**A modern datatable library for the web**

[![Test and Release](https://github.com/ParaLogicTech/datatable/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/ParaLogicTech/datatable/actions/workflows/test-and-release.yml)
[![npm version](https://img.shields.io/npm/v/@paralogic/frappe-datatable.svg)](https://www.npmjs.com/package/@paralogic/frappe-datatable)

> ParaLogic's fork of [frappe/datatable](https://github.com/frappe/datatable), published as `@paralogic/frappe-datatable`. See [Fork additions](#fork-additions).


![datatable-demo-2](https://user-images.githubusercontent.com/9355208/40740030-5412aa40-6465-11e8-8542-b0247ab1daac.gif)

</div>

## Frappe Datatable

Frappe DataTable is a simple, modern and interactive datatable library for displaying tabular data. Originally built for [ERPNext](https://github.com/frappe/erpnext), it can be used to render large amount of rows without sacrificing performance and has the basic data grid features like inline editing and keyboard navigation. It does not require jQuery, unlike most data grids out there.

### Motivation

I was trying to remove all legacy UI components from the [frappe](https://github.com/frappe/frappe) codebase. We were using [SlickGrid](https://github.com/mleibman/SlickGrid) for rendering tables. It was unmaintained and UI was dated. Other datatable solutions either didn't have the features we needed or were closed source. So we built our own.


### Key Features

- **Cell**: Enable editing within individual cells and features like custom formatters, inline editing, and mouse selection. Users can easily copy cell content, navigate through cells using the keyboard, and take advantage of a custom cell editor for advanced functionality.
- **Column**: Columns are highly flexible, allowing users to reorder, resize, and sort them with ease. Additional features include hiding/removing columns and adding custom actions.
- **Row**: Rows support advanced interactions, including row selection, tree-structured organization, and inline filters for precise control. They handle large datasets efficiently with dynamic row heights.


### Fork additions

- **Grouped data**: pass `{ _isGroup: true, rows: [...] }` objects in `data`. They can be nested.
  - With `totals: {...}`, the group renders as a tree: a group-total row with its rows indented under it.
  - Without `totals`, the group renders as a flat list, with a blank row between groups.
- **`getData(rowIndex)`** returns the original row object, also for rows that came from a group.
- **`_excludeFromTotal: true`** on a row object leaves it out of the total row and of `hooks.columnTotal`. Group-total rows set it automatically.
- **Tree-aware sorting**: with `treeView`, sorting orders siblings and keeps child rows under their parent.
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

## Development Setup

* `yarn start` - Start dev server
* Open `index.html` located in the root folder, and start development.
* Run `yarn lint` before committing changes
* `yarn test` - Run the Cypress tests against `index.html` (run `yarn build` first)
* This project uses [commitizen](https://github.com/commitizen/cz-cli) for conventional commit messages, use `yarn commit` command instead of `git commit`
* Releases are automatic: every push to `master` runs semantic-release, which publishes to npm based on the commit messages (`fix:` → patch, `feat:` → minor). See `CLAUDE.md` for details.

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
