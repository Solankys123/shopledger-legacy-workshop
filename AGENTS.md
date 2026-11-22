# ShopLedger

## Project layout

- `server.js` starts the Node.js/Express app, serves `public/`, mounts routers under `/api`, and serves printable HTML at `/orders/:id/invoice`. `config.js` holds the port, shop details, GST rates, and coupon rules.
- `public/index.html`, `public/js/app.js`, and `public/css/style.css` make up the browser UI. The frontend uses plain JavaScript and `XMLHttpRequest`.
- `routes/products.js` serves the catalog and coupons. `routes/orders.js` handles order placement, lookup, and cancellation. `routes/customers.js` handles Khata accounts and settlements. `routes/reports.js` serves the dashboard, GST reconciliation, pricing preview, and export.
- `lib/` contains order, inventory, and ledger logic (`orders.js`, `inventory.js`, `ledger.js`), checkout calculations (`pricing.js`, `coupons.js`, `tax.js`), and supporting modules (`dates.js`, `invoice.js`, `reports.js`, `store.js`). The printable invoice uses `pricing.js` for its figures.
- `lib/store.js` synchronously reads and rewrites `data/db.json`, the tracked application data file. Its path is resolved relative to the module.

## Run and verify

- From the project root, install missing dependencies with `npm install --no-package-lock` and start with `npm start` or `node server.js`. Open `http://localhost:3000` unless `PORT` is set.
- Run `npm test` for Node's built-in test runner. Use `node --check <file>` on changed JavaScript and run targeted checks for the behavior you changed.
- Never modify the project’s `data/db.json` during tests or smoke checks. Pass fresh in-memory fixtures to library functions. For write-path API or browser checks, use a temporary app copy with a fixture at its own `data/db.json`, or stub `store.read` and `store.write` with temporary test data before sending requests. Changing `PORT` alone does not isolate storage.

## Change rules

- Preserve existing behavior unless the task explicitly changes it. Keep fixes local and reuse the existing modules. Avoid unrelated refactors, formatting churn, and dependency changes.
- Match nearby code. Server files use CommonJS (`require`, `exports`, and `module.exports`). JavaScript generally uses `var`, regular functions, two-space indentation, single quotes, and semicolons.
- Keep existing API paths, response shapes, and stored record formats compatible with their callers. When changing billing, check the affected checkout, invoice, and reconciliation paths.
- Keep temporary data, generated files, and `package-lock.json` out of commits unless explicitly required. Stage only files needed for the task.
