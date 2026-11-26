import { test, expect, clickCell } from '../support';

test.describe('Keyboard navigation', () => {
    test('every up press moves one row while the table scrolls up', async ({ page }) => {
        await clickCell(page, 2, 0);
        for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowDown');
        expect((await getFocusedCell(page)).rowIndex).toBe(40);

        for (let row = 39; row >= 15; row--) {
            await page.keyboard.press('ArrowUp');
            await page.waitForTimeout(100);
            const cell = await getFocusedCell(page);
            expect(cell.rowIndex).toBe(row);
            expectInsideViewport(cell);
        }
    });

    test('quick up presses all reach the first row', async ({ page }) => {
        await clickCell(page, 2, 0);
        for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowDown');
        for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowUp');
        const cell = await getFocusedCell(page);
        expect(cell.rowIndex).toBe(0);
        expectInsideViewport(cell);
    });

    test('every down press moves one row while the table scrolls down', async ({ page }) => {
        await clickCell(page, 2, 0);
        for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowDown');
        const cell = await getFocusedCell(page);
        expect(cell.rowIndex).toBe(40);
        expectInsideViewport(cell);
    });

    test('the focused cell is not hidden under the sticky columns', async ({ page }) => {
        await clickCell(page, 2, 0);
        for (let i = 0; i < 11; i++) await page.keyboard.press('ArrowRight');
        const lastCell = await getFocusedCell(page);
        expect(lastCell.colIndex).toBe(11);
        expectInsideViewport(lastCell);

        for (let col = 10; col >= 2; col--) {
            await page.keyboard.press('ArrowLeft');
            const cell = await getFocusedCell(page);
            expect(cell.colIndex).toBe(col);
            expectInsideViewport(cell);
        }
    });

    test('ctrl+arrows reach the edges of a large table', async ({ page }) => {
        await page.locator('#input-large-data').check();
        await page.waitForFunction(() => window.datatable.datamanager.getRowCount() > 1000);
        const lastRow = await page.evaluate(() => window.datatable.datamanager.getRowCount() - 1);

        await clickCell(page, 3, 0);
        await page.keyboard.press('Control+ArrowDown');
        let cell = await getFocusedCell(page);
        expect([cell.rowIndex, cell.colIndex]).toEqual([lastRow, 3]);
        expectInsideViewport(cell);

        await page.keyboard.press('Control+ArrowUp');
        cell = await getFocusedCell(page);
        expect([cell.rowIndex, cell.colIndex]).toEqual([0, 3]);
        expectInsideViewport(cell);

        await page.keyboard.press('Control+ArrowRight');
        cell = await getFocusedCell(page);
        expect(cell.colIndex).toBe(11);
        expectInsideViewport(cell);

        await page.keyboard.press('Control+ArrowLeft');
        cell = await getFocusedCell(page);
        expect(cell.colIndex).toBe(2);
        expectInsideViewport(cell);
    });

    test('shift+arrows keep the selection cursor in view', async ({ page }) => {
        await clickCell(page, 2, 0);

        for (let i = 0; i < 30; i++) await page.keyboard.press('Shift+ArrowDown');
        let cursor = await getSelectionCursor(page);
        expect([cursor.rowIndex, cursor.colIndex]).toEqual([30, 2]);
        expectInsideViewport(cursor);

        for (let i = 0; i < 9; i++) await page.keyboard.press('Shift+ArrowRight');
        cursor = await getSelectionCursor(page);
        expect([cursor.rowIndex, cursor.colIndex]).toEqual([30, 11]);
        expectInsideViewport(cursor);

        // the selection still starts at the focused cell, which has scrolled out of view
        expect(await page.evaluate(() => {
            const { cellmanager } = window.datatable;
            return cellmanager.getCellsInRange(cellmanager.$focusedCell, cellmanager.$selectionCursor).length;
        })).toBe(31 * 10);

        for (let i = 0; i < 30; i++) await page.keyboard.press('Shift+ArrowUp');
        cursor = await getSelectionCursor(page);
        expect([cursor.rowIndex, cursor.colIndex]).toEqual([0, 11]);
        expectInsideViewport(cursor);

        // the keyboard still works after the focused cell left the DOM and came back
        await page.keyboard.press('ArrowDown');
        const cell = await getFocusedCell(page);
        expect([cell.rowIndex, cell.colIndex]).toEqual([1, 2]);
    });

    test('ctrl+up and ctrl+down follow the sorted order', async ({ page }) => {
        await page.evaluate(() => window.datatable.sortColumn(3, 'desc'));
        await page.waitForFunction(() => window.datatable.datamanager.rowViewOrder[0] !== 0);
        const order = await page.evaluate(() => window.datatable.datamanager.rowViewOrder);

        await page.locator('.dt-scrollable .dt-row').first().locator('.dt-cell--col-3').click();
        await page.keyboard.press('Control+ArrowDown');
        let cell = await getFocusedCell(page);
        expect(cell.rowIndex).toBe(order[order.length - 1]);
        expectInsideViewport(cell);

        await page.keyboard.press('Control+ArrowUp');
        cell = await getFocusedCell(page);
        expect(cell.rowIndex).toBe(order[0]);
        expectInsideViewport(cell);
    });
});

function getSelectionCursor(page) {
    return getFocusedCell(page, '$selectionCursor');
}

async function getFocusedCell(page, property = '$focusedCell') {
    return page.evaluate((property) => {
        const { cellmanager, bodyScrollable } = window.datatable;
        const $cell = cellmanager[property];
        const rect = $cell.getBoundingClientRect();
        const view = bodyScrollable.getBoundingClientRect();
        const viewLeft = view.left + bodyScrollable.clientLeft;
        const viewTop = view.top + bodyScrollable.clientTop;
        const stickyRight = Array.from($cell.parentElement.querySelectorAll('.dt-cell--sticky'))
            .filter($sticky => +$sticky.dataset.colIndex < +$cell.dataset.colIndex)
            .reduce((right, $sticky) => Math.max(right, $sticky.getBoundingClientRect().right), viewLeft);

        return {
            rowIndex: +$cell.dataset.rowIndex,
            colIndex: +$cell.dataset.colIndex,
            isConnected: $cell.isConnected,
            rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
            view: {
                left: stickyRight,
                right: viewLeft + bodyScrollable.clientWidth,
                top: viewTop,
                bottom: viewTop + bodyScrollable.clientHeight
            }
        };
    }, property);
}

// Up to a pixel of tolerance: Firefox rounds the scroll width to whole pixels, so at the
// maximum scroll the last column can still end a fraction of a pixel past the edge
function expectInsideViewport({ isConnected, rect, view }) {
    expect(isConnected).toBe(true);
    expect(rect.left).toBeGreaterThanOrEqual(view.left - 1);
    expect(rect.right).toBeLessThanOrEqual(view.right + 1);
    expect(rect.top).toBeGreaterThanOrEqual(view.top - 1);
    expect(rect.bottom).toBeLessThanOrEqual(view.bottom + 1);
}
