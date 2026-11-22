var assert = require('node:assert/strict');
var test = require('node:test');
var invoice = require('../lib/invoice');
var orders = require('../lib/orders');
var pricing = require('../lib/pricing');
var reports = require('../lib/reports');

function mixedCart() {
  return [
    { id: 1, name: 'Rice', hsn: '1006', price: 500, qty: 2 },
    { id: 2, name: 'Ghee', hsn: '0405', price: 500, qty: 1 },
    { id: 3, name: 'Tea', hsn: '0902', price: 500, qty: 1 }
  ];
}

test('checkout caps SAVE10 and applies each HSN rate after allocating the discount', function () {
  var totals = pricing.computeTotals(mixedCart(), 'SAVE10');

  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.discount, 150);
  assert.equal(totals.taxable, 1850);
  assert.equal(totals.tax, 185);
  assert.equal(totals.total, 2035);
  assert.deepEqual(totals.lines.map(function (line) {
    return [line.gstPercent, line.discount, line.taxable, line.tax];
  }), [
    [5, 75, 925, 46.25],
    [12, 37.5, 462.5, 55.5],
    [18, 37.5, 462.5, 83.25]
  ]);
});

test('checkout splits an odd GST paisa between CGST and SGST', function () {
  var totals = pricing.computeTotals([{ hsn: '1006', price: 20.2, qty: 1 }], '');

  assert.equal(totals.discount, 0);
  assert.equal(totals.tax, 1.01);
  assert.equal(totals.cgst, 0.51);
  assert.equal(totals.sgst, 0.50);
  assert.equal(totals.total, 21.21);
});

test('invoice uses explicit rates, known HSN slabs, and the default for unknown HSNs', function () {
  var figures = invoice.computeInvoiceFigures({ items: [
    { name: 'Ghee', hsn: '0405', gstRate: 0.12, price: 100, qty: 2 },
    { name: 'Rice', hsn: '1006', price: 100, qty: 1 },
    { name: 'Other', hsn: '9999', price: 100, qty: 1 }
  ] });

  assert.deepEqual(figures.rows.map(function (row) {
    return [row.gstPercent, row.lineTax];
  }), [[12, 24], [5, 5], [18, 18]]);
  assert.equal(figures.tax, 47);
  assert.equal(figures.cgst, 23.5);
  assert.equal(figures.sgst, 23.5);
  assert.equal(figures.total, 447);
});

test('invoice rounds GST per line before splitting it into CGST and SGST', function () {
  var figures = invoice.computeInvoiceFigures({ items: [
    { hsn: '1006', price: 0.1, qty: 1 },
    { hsn: '1006', price: 0.1, qty: 1 },
    { hsn: '1006', price: 20.1, qty: 1 }
  ] });

  assert.deepEqual(figures.rows.map(function (row) { return row.lineTax; }), [0.01, 0.01, 1.01]);
  assert.equal(figures.tax, 1.03);
  assert.equal(figures.cgst, 0.52);
  assert.equal(figures.sgst, 0.51);
  assert.equal(figures.total, 21.33);
});

test('invoice matches the saved checkout totals for a capped SAVE10 order', function () {
  var db = { nextOrderId: 1001, orders: [] };
  var items = mixedCart();
  var totals = pricing.computeTotals(items, 'SAVE10');
  var order = orders.add(db, {
    date: '01/04/2024',
    items: items,
    coupon: 'SAVE10',
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total
  });
  var figures = invoice.computeInvoiceFigures(order);
  var reconciliation = reports.getGstReconciliation(db);

  assert.equal(order.total, 2035);
  assert.equal(figures.total, 2035);
  assert.equal(figures.subtotal, 2000);
  assert.equal(figures.tax, 185);
  assert.equal(figures.discount, 150);
  assert.deepEqual(figures.rows.map(function (row) { return row.lineTax; }), [46.25, 55.5, 83.25]);
  assert.equal(reconciliation.totalChecked, 1);
  assert.equal(reconciliation.mismatchCount, 0);
  assert.equal(reconciliation.totalDelta, 0);
  assert.equal(reconciliation.rows[0].matched, true);
  var html = invoice.render(order);
  assert.match(html, /Invoice Total<\/td><td class="r">₹2035\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
