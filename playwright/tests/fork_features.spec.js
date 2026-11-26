import { test, expect } from '../support';

// Features that only exist in the @paralogic fork. Upstream's tests don't cover them,
// so these guard against regressions when merging frappe/master.

const columns = [
    { id: 'name', name: 'Name', width: 180 },
    { id: 'qty', name: 'Qty', width: 120 }
];

const treeGroups = [
    {
        _isGroup: true,
        indent: 0,
        totals: { name: 'Group A', qty: 30 },
        rows: [{ name: 'a1', qty: 20 }, { name: 'a2', qty: 10 }]
    },
    {
        _isGroup: true,
        indent: 0,
        totals: { name: 'Group B', qty: 5 },
        rows: [{ name: 'b1', qty: 5 }]
    }
];

const listGroups = [
    { _isGroup: true, rows: [{ name: 'x1', qty: 3 }, { name: 'x2', qty: 1 }] },
    { _isGroup: true, rows: [{ name: 'y1', qty: 2 }] }
];

test.describe('Grouped data', () => {
    test('groups with totals render as a tree with indented rows', async ({ page }) => {
        await createTable(page, { data: treeGroups, treeView: true });
        await expectNames(page, ['Group A', 'a1', 'a2', 'Group B', 'b1']);
        const indents = await page.evaluate(() =>
            window.forkTable.datamanager.getRows().map(row => row.meta.indent));
        expect(indents).toEqual([0, 1, 1, 0, 1]);
    });

    test('groups without totals render as a list with a blank row between groups', async ({ page }) => {
        await createTable(page, { data: listGroups });
        await expectNames(page, ['x1', 'x2', '', 'y1']);
    });

    test('getData returns the original row objects after flattening groups', async ({ page }) => {
        await createTable(page, { data: treeGroups, treeView: true });
        const names = await page.evaluate(() =>
            [0, 1, 2, 3, 4].map(i => window.forkTable.datamanager.getData(i).name));
        expect(names).toEqual(['Group A', 'a1', 'a2', 'Group B', 'b1']);
    });

    test('getData stays in sync after appendRows', async ({ page }) => {
        await createTable(page, { data: treeGroups, treeView: true });
        await page.evaluate(() => {
            window.forkTable.appendRows([{ _isGroup: true, rows: [{ name: 'c1', qty: 1 }] }]);
        });
        const name = await page.evaluate(() => window.forkTable.datamanager.getData(5).name);
        expect(name).toBe('c1');
    });

    test('tree sorting keeps rows under their group', async ({ page }) => {
        await createTable(page, { data: treeGroups, treeView: true });

        await sortColumn(page, 'Qty', 'Sort Ascending');
        await expectNames(page, ['Group B', 'b1', 'Group A', 'a2', 'a1']);

        await sortColumn(page, 'Qty', 'Sort Descending');
        await expectNames(page, ['Group A', 'a1', 'a2', 'Group B', 'b1']);

        await sortColumn(page, 'Name', 'Sort Descending');
        await expectNames(page, ['Group B', 'b1', 'Group A', 'a2', 'a1']);
    });

    test('list view padding rows keep their place when sorting', async ({ page }) => {
        await createTable(page, { data: listGroups });
        await sortColumn(page, 'Qty', 'Sort Ascending');
        await expectNames(page, ['x2', 'x1', '', 'y1']);
    });
});

test.describe('Total row', () => {
    test('group-total rows are left out of the total row', async ({ page }) => {
        await createTable(page, { data: treeGroups, treeView: true, showTotalRow: true });
        await expect(footerCell(page, 1)).toHaveText('35');
    });

    test('_excludeFromTotal rows are left out of the total and of columnTotal', async ({ page }) => {
        await createTable(page, {
            data: [
                { name: 'r1', qty: 1 },
                { name: 'r2', qty: 2 },
                { name: 'skip', qty: 100, _excludeFromTotal: true }
            ],
            showTotalRow: true
        });
        await expect(footerCell(page, 1)).toHaveText('3');

        await createTable(page, {
            data: [
                { name: 'r1', qty: 1 },
                { name: 'skip', qty: 100, _excludeFromTotal: true }
            ],
            showTotalRow: true,
            hooks: {
                columnTotal: (values, cell) => {
                    if (cell.colIndex !== 1) return null;
                    window.columnTotalValues = values;
                    return values.length;
                }
            }
        });
        expect(await page.evaluate(() => window.columnTotalValues)).toEqual([1]);
        await expect(footerCell(page, 1)).toHaveText('1');
    });
});

test.describe('Inline filters', () => {
    test('pasted filter text is applied', async ({ page }) => {
        await createTable(page, { data: [{ name: 'r1', qty: 1 }, { name: 'r2', qty: 2 }], inlineFilters: true });
        await page.evaluate(() => window.forkTable.columnmanager.toggleFilter(true));

        // insertText changes the value like a paste does: an input event, but no keydown
        const filter = page.locator('#datatable2 .dt-filter[data-col-index="0"]');
        await filter.focus();
        await page.keyboard.insertText('r2');
        await expectNames(page, ['r2']);

        // clearing it without the keyboard, like cutting with the mouse
        await filter.evaluate($input => {
            $input.select();
            document.execCommand('delete');
        });
        await expectNames(page, ['r1', 'r2']);
    });

    test('a text filter on a number column matches the formatted value', async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));

        await page.evaluate(() => {
            window.forkTable = new window.DataTable('#datatable2', {
                columns: [
                    { id: 'name', name: 'Name' },
                    { id: 'amount', name: 'Amount', format: value => value.toLocaleString('en-US') }
                ],
                data: [{ name: 'r1', amount: 1069 }, { name: 'r2', amount: 25 }, { name: 'r3', amount: 0 }],
                serialNoColumn: false,
                checkboxColumn: false,
                inlineFilters: true
            });
        });
        const rows = page.locator('#datatable2 .dt-scrollable .dt-row');
        await expect(rows).toHaveCount(3);

        await page.evaluate(() => window.forkTable.columnmanager.applyFilter({ 1: '1,069' }));
        await expectNames(page, ['r1']);

        await page.evaluate(() => window.forkTable.columnmanager.applyFilter({ 1: 'abc' }));
        await expect(rows).toHaveCount(0);

        expect(errors).toEqual([]);
    });

    test('!= leaves out cells whose whole text matches', async ({ page }) => {
        await page.evaluate(() => {
            window.forkTable = new window.DataTable('#datatable2', {
                columns: [
                    { id: 'name', name: 'Name' },
                    { id: 'status', name: 'Status', format: value => `<b>${value}</b>` },
                    { id: 'qty', name: 'Qty' }
                ],
                data: [
                    { name: 'r1', status: 'Paid', qty: 5 },
                    { name: 'r2', status: 'Unpaid', qty: 0 },
                    { name: 'r3', status: 'Draft', qty: 7 }
                ],
                serialNoColumn: false,
                checkboxColumn: false,
                inlineFilters: true
            });
        });
        const filter = filters => page.evaluate(f => window.forkTable.columnmanager.applyFilter(f), filters);

        await filter({ 1: '!=paid' });
        await expectNames(page, ['r2', 'r3']);

        await filter({ 1: '!= Draft ' });
        await expectNames(page, ['r1', 'r2']);

        await filter({ 2: '!=5' });
        await expectNames(page, ['r2', 'r3']);

        // a bare = or != filters nothing until a value is typed
        await filter({ 2: '!=' });
        await expectNames(page, ['r1', 'r2', 'r3']);
        await filter({ 2: '= ' });
        await expectNames(page, ['r1', 'r2', 'r3']);
    });
});

test.describe('Keyboard', () => {
    test('shift+arrow past the table edge does not throw', async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));

        await createTable(page, { data: [{ name: 'r1', qty: 1 }, { name: 'r2', qty: 2 }] });
        await page.locator('#datatable2 .dt-cell--1-1').click();
        await page.keyboard.press('Shift+ArrowRight');
        await page.keyboard.press('Shift+ArrowDown');
        await page.keyboard.press('Shift+ArrowDown');

        expect(errors).toEqual([]);
    });
});

async function createTable(page, options) {
    await page.evaluate(({ columns, options, hooks }) => {
        // eslint-disable-next-line no-new-func
        const hookFns = new Function(`return (${hooks})`)();
        window.forkTable = new window.DataTable('#datatable2', Object.assign({
            columns,
            serialNoColumn: false,
            checkboxColumn: false
        }, JSON.parse(options), hookFns ? { hooks: hookFns } : {}));
    }, {
        columns,
        options: JSON.stringify(Object.assign({}, options, { hooks: undefined })),
        hooks: options.hooks ? serializeHooks(options.hooks) : 'null'
    });
    await expect(page.locator('#datatable2 .datatable')).toHaveCount(1);
}

function serializeHooks(hooks) {
    return `{${Object.entries(hooks).map(([name, fn]) => `${name}: ${fn.toString()}`).join(',')}}`;
}

async function sortColumn(page, columnName, label) {
    await page.locator('#datatable2 .dt-cell--header', { hasText: columnName })
        .locator('.dt-dropdown__toggle').click();
    await page.locator('#datatable2 .dt-dropdown__list-item', { hasText: label }).dispatchEvent('click');
}

async function expectNames(page, expected) {
    await expect(page.locator('#datatable2 .dt-scrollable .dt-row .dt-cell--col-0 .dt-cell__content'))
        .toHaveText(expected);
}

function footerCell(page, colIndex) {
    return page.locator(`#datatable2 .dt-footer .dt-cell--col-${colIndex} .dt-cell__content`);
}
