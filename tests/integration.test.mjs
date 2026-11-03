import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';

function loadLocalEnvironment() {
  for (const file of ['.env.local', '.env']) {
    let contents;
    try {
      contents = readFileSync(resolve(process.cwd(), file), 'utf8');
    } catch {
      continue;
    }

    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
      process.env[match[1]] = value;
    }
  }
}

loadLocalEnvironment();

const baseUrl = process.env.FRESHTRACK_BASE_URL || 'http://localhost:3000';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000
});
let testSession = '';

async function authenticatedHeaders(headers = {}) {
  return { ...headers, Cookie: testSession };
}

async function fetchPage(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(new URL(path, baseUrl), { headers: testSession ? { Cookie: testSession } : {} });
    if (response.status !== 404 || attempt === 3) return response;
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw new Error(`Could not load ${path}`);
}

test('FreshTrack read-only integration and validation checks', async t => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be configured in .env.local');
  const login = await fetch(new URL('/api/auth/login', baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@freshtrack.local', password: 'Admin123!' })
  });
  assert.equal(login.status, 200, 'demo admin login should succeed');
  testSession = login.headers.get('set-cookie')?.split(';', 1)[0] || '';
  assert.ok(testSession, 'login should create a session cookie');

  const counts = async () => {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM products)::int AS products,
        (SELECT COUNT(*) FROM inventory_batches)::int AS batches,
        (SELECT COUNT(*) FROM waste_records)::int AS waste
    `);
    return result.rows[0];
  };

  try {
    const before = await counts();

    await t.test('dashboard and page routes render', async () => {
      for (const path of ['/', '/inventory', '/waste']) {
        const response = await fetchPage(path);
        assert.equal(response.status, 200, `${path} should load`);
      }
    });

    const inventoryResponse = await fetch(new URL('/api/inventory', baseUrl), { headers: await authenticatedHeaders() });
    assert.equal(inventoryResponse.status, 200);
    const inventory = await inventoryResponse.json();
    assert.ok(Array.isArray(inventory));

    const wasteResponse = await fetch(new URL('/api/waste', baseUrl), { headers: await authenticatedHeaders() });
    assert.equal(wasteResponse.status, 200);
    const waste = await wasteResponse.json();
    assert.ok(Array.isArray(waste));

    await t.test('API list results match PostgreSQL record counts', async () => {
      const expected = await counts();
      assert.equal(inventory.length, expected.batches);
      assert.equal(waste.length, Math.min(expected.waste, 200));
    });

    await t.test('dashboard metrics match live PostgreSQL aggregates', async () => {
      const [stock, units, risk, loss] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS count FROM inventory_batches WHERE quantity > 0'),
        pool.query('SELECT unit, SUM(quantity)::numeric::text AS quantity FROM inventory_batches WHERE quantity > 0 GROUP BY unit'),
        pool.query('SELECT COUNT(*)::int AS count FROM inventory_batches WHERE quantity > 0 AND expiry_date <= CURRENT_DATE + 7'),
        pool.query("SELECT COALESCE(SUM(estimated_loss), 0)::numeric::text AS amount FROM waste_records WHERE wasted_at >= CURRENT_DATE - INTERVAL '30 days'")
      ]);
      const response = await fetch(new URL('/', baseUrl), { headers: await authenticatedHeaders() });
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, new RegExp(`Active batches</div><div class="metric">${stock.rows[0].count}</div>`));
      assert.match(html, new RegExp(`Expiry risk</div><div class="metric">${risk.rows[0].count}</div>`));
      assert.ok(html.includes(new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(Number(loss.rows[0].amount))));
      for (const row of units.rows) {
        assert.ok(html.includes(row.unit), `dashboard should show ${row.unit} separately`);
      }
    });

    await t.test('invalid inventory and waste submissions are rejected without writes', async () => {
      const invalidRequests = [
        {
          url: '/api/inventory',
          method: 'POST',
          body: { name: '', quantity: 1, expiry_date: '2026-12-01' }
        },
        {
          url: '/api/inventory',
          method: 'POST',
          body: { name: 'Invalid Test', quantity: 0, purchase_date: '2026-10-24', expiry_date: '2026-12-01' }
        },
        {
          url: '/api/inventory',
          method: 'POST',
          body: { name: 'Invalid Test', quantity: 1, purchase_date: '2026-12-02', expiry_date: '2026-12-01' }
        },
        {
          url: '/api/waste',
          method: 'POST',
          body: { product_id: 1, quantity: -1, reason: 'Spoilage' }
        },
        {
          url: '/api/waste',
          method: 'POST',
          body: { product_id: 1, quantity: 1, reason: 'invalid-reason' }
        }
      ];

      for (const request of invalidRequests) {
        const response = await fetch(new URL(request.url, baseUrl), {
          method: request.method,
          headers: await authenticatedHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(request.body)
        });
        assert.equal(response.status, 400, `${request.url} should reject invalid input`);
        const result = await response.json();
        assert.equal(typeof result.error, 'string', 'rejected request should include a useful error');
      }

      const after = await counts();
      assert.deepEqual(after, before, 'invalid requests must not change PostgreSQL records');
    });

    await t.test('insufficient stock is rejected without recording waste', async () => {
      const productId = inventory.find(item => Number(item.quantity) > 0)?.product_id;
      if (productId === undefined) return t.skip('No positive stock exists to check');

      const response = await fetch(new URL('/api/waste', baseUrl), {
        method: 'POST',
        headers: await authenticatedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          product_id: productId,
          quantity: 999999999999,
          reason: 'Spoilage'
        })
      });
      assert.equal(response.status, 409);
      const result = await response.json();
      assert.match(result.error, /enough stock/i);
      assert.deepEqual(await counts(), before, 'insufficient stock must not change PostgreSQL records');
    });

    await t.test('MongoDB event collection is reachable and count matches aggregation', async () => {
      assert.ok(process.env.MONGODB_URI, 'MONGODB_URI must be configured in .env.local');
      const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || 'smart_food_waste');
        assert.equal((await db.command({ ping: 1 })).ok, 1);
        const collection = db.collection('inventory_events');
        const [count, groups] = await Promise.all([
          collection.countDocuments(),
          collection.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]).toArray()
        ]);
        assert.equal(groups.reduce((sum, group) => sum + group.count, 0), count);
      } finally {
        await client.close();
      }
    });
  } finally {
    await pool.end();
  }
});
