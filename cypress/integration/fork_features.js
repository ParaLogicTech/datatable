// Features that only exist in the @paralogic fork. Upstream's tests don't cover them,
// so these guard against regressions (e.g. when merging frappe/master).

const columns = [
    { id: 'name', name: 'Name', width: 180 },
    { id: 'qty', name: 'Qty', width: 120 }
];

const treeGroups = () => [
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

const listGroups = () => [
    { _isGroup: true, rows: [{ name: 'x1', qty: 3 }, { name: 'x2', qty: 1 }] },
    { _isGroup: true, rows: [{ name: 'y1', qty: 2 }] }
];

function createTable(options) {
    return cy.window().then(win => {
        win.forkTable = new win.DataTable('#datatable2', Object.assign({
            columns,
            serialNoColumn: false,
            checkboxColumn: false
        }, options));
        return win.forkTable;
    });
}

function expectNames(expected) {
    cy.get('#datatable2 .dt-scrollable .dt-row .dt-cell--col-0 .dt-cell__content')
        .should($cells => {
            expect($cells.toArray().map(el => el.textContent.trim())).to.deep.equal(expected);
        });
}

function sortColumn(columnName, label) {
    cy.get('#datatable2 .dt-cell--header').contains(columnName)
        .closest('.dt-cell--header')
        .find('.dt-dropdown__toggle')
        .click();
    cy.get(`#datatable2 .dt-dropdown__list-item:contains("${label}")`).click({ force: true });
}

function expectFooterText(colIndex, expected) {
    return cy.get(`#datatable2 .dt-footer .dt-cell--col-${colIndex} .dt-cell__content`)
        .should($cell => expect($cell.text().trim()).to.equal(expected));
}

describe('Fork: grouped data', function () {
    beforeEach(function () {
        cy.visit('/');
    });

    it('groups with totals render as a tree with indented rows', function () {
        createTable({ data: treeGroups(), treeView: true }).then(table => {
            expect(table.datamanager.getRows().map(row => row.meta.indent)).to.deep.equal([0, 1, 1, 0, 1]);
        });
        expectNames(['Group A', 'a1', 'a2', 'Group B', 'b1']);
    });

    it('groups without totals render as a list with a blank row between groups', function () {
        createTable({ data: listGroups() });
        expectNames(['x1', 'x2', '', 'y1']);
    });

    it('getData returns the original row objects after flattening groups', function () {
        createTable({ data: treeGroups(), treeView: true }).then(table => {
            const names = [0, 1, 2, 3, 4].map(i => table.datamanager.getData(i).name);
            expect(names).to.deep.equal(['Group A', 'a1', 'a2', 'Group B', 'b1']);
        });
    });

    it('getData stays in sync after appendRows', function () {
        createTable({ data: treeGroups(), treeView: true }).then(table => {
            table.appendRows([{ _isGroup: true, rows: [{ name: 'c1', qty: 1 }] }]);
            expect(table.datamanager.getData(5).name).to.equal('c1');
        });
    });

    it('tree sorting keeps rows under their group', function () {
        createTable({ data: treeGroups(), treeView: true });

        sortColumn('Qty', 'Sort Ascending');
        expectNames(['Group B', 'b1', 'Group A', 'a2', 'a1']);

        sortColumn('Qty', 'Sort Descending');
        expectNames(['Group A', 'a1', 'a2', 'Group B', 'b1']);

        sortColumn('Name', 'Sort Descending');
        expectNames(['Group B', 'b1', 'Group A', 'a2', 'a1']);
    });
});

describe('Fork: total row', function () {
    beforeEach(function () {
        cy.visit('/');
    });

    it('group-total rows are left out of the total row', function () {
        createTable({ data: treeGroups(), treeView: true, showTotalRow: true });
        expectFooterText(1, '35');
    });

    it('_excludeFromTotal rows are left out of the total row', function () {
        createTable({
            data: [
                { name: 'r1', qty: 1 },
                { name: 'r2', qty: 2 },
                { name: 'skip', qty: 100, _excludeFromTotal: true }
            ],
            showTotalRow: true
        });
        expectFooterText(1, '3');
    });

    it('_excludeFromTotal rows are not passed to the columnTotal hook', function () {
        let received = null;
        createTable({
            data: [
                { name: 'r1', qty: 1 },
                { name: 'skip', qty: 100, _excludeFromTotal: true }
            ],
            showTotalRow: true,
            hooks: {
                columnTotal(values, cell) {
                    if (cell.colIndex !== 1) return null;
                    received = values;
                    return values.length;
                }
            }
        });
        expectFooterText(1, '1').then(() => {
            expect(received).to.deep.equal([1]);
        });
    });
});

describe('Fork: keyboard', function () {
    beforeEach(function () {
        cy.visit('/');
    });

    it('shift+arrow past the table edge does not throw', function () {
        createTable({ data: [{ name: 'r1', qty: 1 }, { name: 'r2', qty: 2 }] });
        cy.get('#datatable2 .dt-cell--1-1').click();
        // Cypress fails the test on any uncaught exception
        cy.focused().type('{shift}{rightarrow}{downarrow}{downarrow}', { release: false });
    });
});
