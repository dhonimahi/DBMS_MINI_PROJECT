import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { logEvent } from '@/lib/mongo';
import { authorizationError, requireRole } from '@/lib/auth';

type InventoryInput = {
  name?: unknown;
  category?: unknown;
  quantity?: unknown;
  unit?: unknown;
  purchase_date?: unknown;
  expiry_date?: unknown;
  cost_per_unit?: unknown;
  supplier?: unknown;
};

function isObject(value: unknown): value is InventoryInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function parseValues(input: InventoryInput) {
  const name = text(input.name);
  const category = text(input.category, 'Other') || 'Other';
  const unit = text(input.unit, 'units') || 'units';
  const supplier = text(input.supplier);
  const quantity = Number(input.quantity);
  const cost = input.cost_per_unit === undefined || input.cost_per_unit === '' ? 0 : Number(input.cost_per_unit);
  const purchaseDate = input.purchase_date === undefined || input.purchase_date === ''
    ? new Date().toISOString().slice(0, 10)
    : input.purchase_date;
  const expiryDate = input.expiry_date;

  if (!name || name.length > 150 || category.length > 60 || unit.length > 20 || supplier.length > 150) {
    return { error: 'Enter a product name and valid category, unit and supplier lengths.' } as const;
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(cost) || cost < 0) {
    return { error: 'Enter a positive quantity and a non-negative cost.' } as const;
  }
  if (!isDate(purchaseDate) || !isDate(expiryDate) || expiryDate < purchaseDate) {
    return { error: 'Enter valid purchase and expiry dates; expiry cannot be before purchase.' } as const;
  }

  return { values: { name, category, quantity, unit, purchaseDate, expiryDate, cost, supplier } } as const;
}

export async function GET() {
  try {
    const result = await query(`
      SELECT b.id, b.product_id, p.name AS product_name, p.category, b.quantity, b.unit,
             b.purchase_date::text, b.expiry_date::text, b.cost_per_unit, b.supplier
      FROM inventory_batches b
      JOIN products p ON p.id = b.product_id
      ORDER BY b.expiry_date ASC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Could not load inventory:', error);
    return NextResponse.json({ error: 'Could not load inventory. Check database setup.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireRole(request, ['admin', 'staff']);
  if (!user) return authorizationError();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!isObject(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  const parsed = parseValues(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { name, category, quantity, unit, purchaseDate, expiryDate, cost, supplier } = parsed.values;
  const client = await pool.connect().catch(error => {
    console.error('Could not connect to PostgreSQL for inventory creation:', error);
    return null;
  });
  if (!client) return NextResponse.json({ error: 'Could not save inventory. Check the database connection.' }, { status: 503 });

  try {
    await client.query('BEGIN');
    const product = await client.query(
      `INSERT INTO products(name, category) VALUES($1, $2)
       ON CONFLICT(name) DO UPDATE SET category = EXCLUDED.category
       RETURNING id`,
      [name, category]
    );
    const batch = await client.query(
      `INSERT INTO inventory_batches(product_id, quantity, unit, purchase_date, expiry_date, cost_per_unit, supplier)
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [product.rows[0].id, quantity, unit, purchaseDate, expiryDate, cost, supplier]
    );
    await client.query('COMMIT');
    await logEvent(
      'inventory_batch_created',
      { batchId: batch.rows[0].id, product: name, quantity, unit },
      { entityType: 'inventory_batch', entityId: batch.rows[0].id }
    );
    return NextResponse.json({ ok: true, id: batch.rows[0].id }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK').catch(rollbackError => console.error('Inventory create rollback failed:', rollbackError));
    console.error('Could not create inventory batch:', error);
    return NextResponse.json({ error: 'Could not save inventory. Check the submitted values and database setup.' }, { status: 500 });
  } finally {
    client.release();
  }
}
