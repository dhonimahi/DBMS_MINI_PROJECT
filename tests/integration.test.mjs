// Import strict assertions to compare results with expectations.
import assert from 'node:assert/strict';
// Import the synchronous helper used to read local environment files.
import { readFileSync } from 'node:fs';
// Import the path helper used to locate the files.
import { resolve } from 'node:path';
// Import Node's built-in test runner.
import test from 'node:test';
// Import the MongoDB driver for direct database checks.
import { MongoClient } from 'mongodb';
// Import the PostgreSQL pool for direct comparison queries.
import { Pool } from 'pg';

// Load local environment values for the integration process.
function loadLocalEnvironment() {
  // Check .env.local first so it takes precedence over .env.
  for (const file of ['.env.local', '.env']) {
    // Declare a variable to hold the current file's text.
    let contents;
    // Handle the case where an environment file is absent or cannot be read.
    try {
      // Read the selected file from the current working directory.
      contents = readFileSync(resolve(process.cwd(), file), 'utf8');
    // Skip files that could not be read.
    } catch {
      // Continue to the next environment file.
      continue;
    // Finish handling file read errors.
    }

    // Process each physical line in the file.
    for (const line of contents.split(/\r?\n/)) {
      // Extract a variable name and value from an assignment, allowing a leading export.
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      // Skip invalid lines and keep any value that is already defined.
      if (!match || process.env[match[1]] !== undefined) continue;
      // Remove matching surrounding single or double quotes.
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
      // Set the variable for this test process.
      process.env[match[1]] = value;
    // Finish reading the lines in this file.
    }
  // Finish reading the environment files.
  }
// End the test environment loader.
}

// Load the local configuration before initializing the test clients.
loadLocalEnvironment();

// Choose the app URL from the environment or use the default localhost server.
const baseUrl = process.env.FRESHTRACK_BASE_URL || 'http://localhost:3000';
// Open a pool for independent SQL assertions.
const pool = new Pool({
  // Use the configured PostgreSQL connection string.
  connectionString: process.env.DATABASE_URL,
  // Stop waiting for a SQL connection after five seconds.
  connectionTimeoutMillis: 5000
// Finish configuring the pool.
});
// Start without an authenticated session cookie.
let testSession = '';

// Attach the active login cookie to headers for authenticated test requests.
async function authenticatedHeaders(headers = {}) {
  // Preserve the supplied headers and append the Cookie header.
  return { ...headers, Cookie: testSession };
// End the authenticated header helper.
}

// Load a page, retrying the transient 404 case.
async function fetchPage(path) {
  // Allow up to four attempts.
  for (let attempt = 0; attempt < 4; attempt++) {
    // Send a request to the configured server with the session cookie when available.
    const response = await fetch(new URL(path, baseUrl), { headers: testSession ? { Cookie: testSession } : {} });
    // Return immediately for a non-404 response, or after the last attempt.
    if (response.status !== 404 || attempt === 3) return response;
    // Wait a little longer before each retry.
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  // End the retry loop.
  }
  // Raise a diagnostic error if the loop finishes without returning.
  throw new Error(`Could not load ${path}`);
// End the page fetch helper.
}

// Start the integration test suite and its nested checks.
test('FreshTrack read-only integration and validation checks', async t => {
  // Require PostgreSQL configuration before testing.
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be configured in .env.local');
  // Send the seeded demo administrator credentials to the login endpoint.
  const login = await fetch(new URL('/api/auth/login', baseUrl), {
    // Use an HTTP POST request.
    method: 'POST',
    // Declare that the payload is JSON.
    headers: { 'Content-Type': 'application/json' },
    // Encode the seeded demo account credentials in the request body.
    body: JSON.stringify({ email: 'admin@freshtrack.local', password: 'Admin123!' })
  // Finish the login request.
  });
  // Require a successful login response.
  assert.equal(login.status, 200, 'demo admin login should succeed');
  // Extract the cookie name and value from the Set-Cookie response header.
  testSession = login.headers.get('set-cookie')?.split(';', 1)[0] || '';
  // Require a session cookie for subsequent checks.
  assert.ok(testSession, 'login should create a session cookie');

  // Define a helper to count records in three PostgreSQL tables.
  const counts = async () => {
    // Line 117 — Run the count comparison query through the test pool.
    // Line 118 — Select all three totals as separate columns in one result row.
    // Line 119 — Count products and convert the count to an integer.
    // Line 120 — Count inventory batches and convert the count to an integer.
    // Line 121 — Count waste rows and convert the count to an integer.
    // Line 122 — Finish the table count query.
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM products)::int AS products,
        (SELECT COUNT(*) FROM inventory_batches)::int AS batches,
        (SELECT COUNT(*) FROM waste_records)::int AS waste
    `);
    // Return the combined count row.
    return result.rows[0];
  // End the count helper.
  };

  // Run the nested checks with database cleanup at the end.
  try {
    // Capture the baseline counts used to check rejected writes.
    const before = await counts();

    // Verify that the authenticated pages render.
    await t.test('dashboard and page routes render', async () => {
      // Visit the dashboard, inventory and waste pages.
      for (const path of ['/', '/inventory', '/waste']) {
        // Fetch the current page with the authenticated helper.
        const response = await fetchPage(path);
        // Require HTTP 200 for that path.
        assert.equal(response.status, 200, `${path} should load`);
      // Finish checking the page URLs.
      }
    // End the page-rendering check.
    });

    // Request the inventory list from the API with the login cookie.
    const inventoryResponse = await fetch(new URL('/api/inventory', baseUrl), { headers: await authenticatedHeaders() });
    // Require a successful inventory response.
    assert.equal(inventoryResponse.status, 200);
    // Decode the inventory response.
    const inventory = await inventoryResponse.json();
    // Require an array of inventory rows.
    assert.ok(Array.isArray(inventory));

    // Request the waste history from the API with the login cookie.
    const wasteResponse = await fetch(new URL('/api/waste', baseUrl), { headers: await authenticatedHeaders() });
    // Require a successful waste history response.
    assert.equal(wasteResponse.status, 200);
    // Decode the waste response.
    const waste = await wasteResponse.json();
    // Require an array of waste rows.
    assert.ok(Array.isArray(waste));

    // Compare the two API list sizes with the database.
    await t.test('API list results match PostgreSQL record counts', async () => {
      // Read the expected table counts using SQL.
      const expected = await counts();
      // Require the returned inventory count to equal the batch count.
      assert.equal(inventory.length, expected.batches);
      // Account for the API's 200-row waste limit when comparing counts.
      assert.equal(waste.length, Math.min(expected.waste, 200));
    // Finish the list count check.
    });

    // Compare the rendered dashboard with independent SQL totals.
    await t.test('dashboard metrics match live PostgreSQL aggregates', async () => {
      // Run the comparison queries in parallel.
      const [stock, units, risk, loss] = await Promise.all([
        // Count batches with positive stock.
        pool.query('SELECT COUNT(*)::int AS count FROM inventory_batches WHERE quantity > 0'),
        // Sum available stock separately for each measurement unit.
        pool.query('SELECT unit, SUM(quantity)::numeric::text AS quantity FROM inventory_batches WHERE quantity > 0 GROUP BY unit'),
        // Count batches with stock expiring within seven days or already expired.
        pool.query('SELECT COUNT(*)::int AS count FROM inventory_batches WHERE quantity > 0 AND expiry_date <= CURRENT_DATE + 7'),
        // Sum the recent estimated losses using the dashboard's 30-day cutoff.
        pool.query("SELECT COALESCE(SUM(estimated_loss), 0)::numeric::text AS amount FROM waste_records WHERE wasted_at >= CURRENT_DATE - INTERVAL '30 days'")
      // Finish fetching the comparison totals.
      ]);
      // Fetch the authenticated dashboard.
      const response = await fetch(new URL('/', baseUrl), { headers: await authenticatedHeaders() });
      // Read the server-rendered HTML.
      const html = await response.text();
      // Require a successful HTTP status.
      assert.equal(response.status, 200);
      // Match the active batches metric against the live count.
      assert.match(html, new RegExp(`Active batches</div><div class="metric">${stock.rows[0].count}</div>`));
      // Match the expiry risk metric against the live count.
      assert.match(html, new RegExp(`Expiry risk</div><div class="metric">${risk.rows[0].count}</div>`));
      // Check that the HTML includes the recent loss formatted as Indian currency.
      assert.ok(html.includes(new Intl.NumberFormat('en-IN', {
        // Set the format style to currency.
        style: 'currency',
        // Select the Indian rupee.
        currency: 'INR',
        // Use no fractional digits in the displayed amount.
        maximumFractionDigits: 0
      // Format the expected database total and look for it in the HTML.
      }).format(Number(loss.rows[0].amount))));
      // Iterate over the units returned by the stock query.
      for (const row of units.rows) {
        // Require the dashboard to display each available unit.
        assert.ok(html.includes(row.unit), `dashboard should show ${row.unit} separately`);
      // Finish checking the stock units.
      }
    // End the dashboard metric check.
    });

    // Test that invalid requests are rejected without changing record counts.
    await t.test('invalid inventory and waste submissions are rejected without writes', async () => {
      // Define the list of invalid submissions to try.
      const invalidRequests = [
        // Start the missing-name case.
        {
          // Point it to the inventory endpoint.
          url: '/api/inventory',
          // Use POST to exercise inventory creation.
          method: 'POST',
          // Supply a blank product name.
          body: { name: '', quantity: 1, expiry_date: '2026-12-01' }
        // Finish the missing-name case.
        },
        // Start the zero-quantity case.
        {
          // Point it to the inventory endpoint.
          url: '/api/inventory',
          // Use POST to exercise inventory creation.
          method: 'POST',
          // Supply zero as the starting quantity.
          body: { name: 'Invalid Test', quantity: 0, purchase_date: '2026-10-24', expiry_date: '2026-12-01' }
        // Finish the zero-quantity case.
        },
        // Start the invalid-date-order case.
        {
          // Point it to the inventory endpoint.
          url: '/api/inventory',
          // Use POST to exercise inventory creation.
          method: 'POST',
          // Submit an expiry date earlier than the purchase date.
          body: { name: 'Invalid Test', quantity: 1, purchase_date: '2026-12-02', expiry_date: '2026-12-01' }
        // Finish the invalid-date-order case.
        },
        // Start the negative-waste case.
        {
          // Point it to the waste endpoint.
          url: '/api/waste',
          // Use POST to exercise waste recording.
          method: 'POST',
          // Submit a negative waste quantity.
          body: { product_id: 1, quantity: -1, reason: 'Spoilage' }
        // Finish the negative-waste case.
        },
        // Start the unknown-reason case.
        {
          // Point it to the waste endpoint.
          url: '/api/waste',
          // Use POST to exercise waste recording.
          method: 'POST',
          // Submit a reason outside the accepted list.
          body: { product_id: 1, quantity: 1, reason: 'invalid-reason' }
        // Finish the unknown-reason case.
        }
      // End the invalid request list.
      ];

      // Submit each invalid request in the list.
      for (const request of invalidRequests) {
        // Build the full URL from the path and server URL.
        const response = await fetch(new URL(request.url, baseUrl), {
          // Use the HTTP method defined by the case.
          method: request.method,
          // Set the JSON header and authenticated session cookie.
          headers: await authenticatedHeaders({ 'Content-Type': 'application/json' }),
          // Serialize the invalid body from the case.
          body: JSON.stringify(request.body)
        // Finish submitting the request.
        });
        // Require every invalid case to receive HTTP 400.
        assert.equal(response.status, 400, `${request.url} should reject invalid input`);
        // Read the error response as JSON.
        const result = await response.json();
        // Require a readable error field.
        assert.equal(typeof result.error, 'string', 'rejected request should include a useful error');
      // Finish checking all cases.
      }

      // Recount the PostgreSQL rows after the attempted writes.
      const after = await counts();
      // Require the database counts to match the baseline.
      assert.deepEqual(after, before, 'invalid requests must not change PostgreSQL records');
    // Finish the invalid-input check.
    });

    // Exercise the case where no one batch can cover the requested waste.
    await t.test('insufficient stock is rejected without recording waste', async () => {
      // Find a product with at least one positive-stock batch.
      const productId = inventory.find(item => Number(item.quantity) > 0)?.product_id;
      // Skip the check if there is no stocked product to use.
      if (productId === undefined) return t.skip('No positive stock exists to check');

      // Submit a waste request for that product.
      const response = await fetch(new URL('/api/waste', baseUrl), {
        // Use HTTP POST.
        method: 'POST',
        // Send JSON with the session cookie.
        headers: await authenticatedHeaders({ 'Content-Type': 'application/json' }),
        // Build the waste request payload.
        body: JSON.stringify({
          // Use the stocked product found earlier.
          product_id: productId,
          // Request an amount too large for a batch to cover.
          quantity: 999999999999,
          // Use a valid reason so the request reaches the stock check.
          reason: 'Spoilage'
        // Finish encoding the waste payload.
        })
      // Finish sending the request.
      });
      // Require HTTP 409 for insufficient stock.
      assert.equal(response.status, 409);
      // Read the failed stock check response.
      const result = await response.json();
      // Require a message explaining the stock shortage.
      assert.match(result.error, /enough stock/i);
      // Require the table counts to remain at their baseline values.
      assert.deepEqual(await counts(), before, 'insufficient stock must not change PostgreSQL records');
    // Finish the insufficient-stock check.
    });

    // Check that the MongoDB event store responds and returns consistent counts.
    await t.test('MongoDB event collection is reachable and count matches aggregation', async () => {
      // Require a configured MongoDB URI for the test.
      assert.ok(process.env.MONGODB_URI, 'MONGODB_URI must be configured in .env.local');
      // Create a test client with a five-second server selection timeout.
      const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      // Ensure the test client closes when the check ends.
      try {
        // Connect the test client to MongoDB.
        await client.connect();
        // Select the configured event database or use the project default.
        const db = client.db(process.env.MONGODB_DB || 'smart_food_waste');
        // Ping the database and require a successful response.
        assert.equal((await db.command({ ping: 1 })).ok, 1);
        // Select the inventory_events collection.
        const collection = db.collection('inventory_events');
        // Run the raw count and grouped count in parallel.
        const [count, groups] = await Promise.all([
          // Count all documents directly.
          collection.countDocuments(),
          // Group by event type and count each group.
          collection.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]).toArray()
        // Wait for both count queries to finish.
        ]);
        // Require the sum of the group counts to equal the direct document count.
        assert.equal(groups.reduce((sum, group) => sum + group.count, 0), count);
      // Clean up after the MongoDB check even if an assertion fails.
      } finally {
        // Close the test MongoDB client.
        await client.close();
      // Finish MongoDB cleanup.
      }
    // End the MongoDB check.
    });
  // Always release the PostgreSQL resources at the end of the suite.
  } finally {
    // Close the PostgreSQL test pool.
    await pool.end();
  // Finish cleanup.
  }
// End the integration suite.
});
