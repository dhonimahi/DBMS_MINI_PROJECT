import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { logEvent } from '@/lib/mongo';

type InventoryUpdate = {
  quantity?: unknown;
  unit?: unknown;
  purchase_date?: unknown;
  expiry_date?: unknown;
  cost_per_unit?: unknown;
  supplier?: unknown;
};

function isObject(value: unknown): value is InventoryUpdate {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Inventory batch ID is invalid.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!isObject(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  const quantity = Number(body.quantity);
  const cost = body.cost_per_unit === undefined || body.cost_per_unit === '' ? 0 : Number(body.cost_per_unit);
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  const supplier = typeof body.supplier === 'string' ? body.supplier.trim() : '';
  const purchaseDate = body.purchase_date;
  const expiryDate = body.expiry_date;

  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(cost) || cost < 0 ||
      !unit || unit.length > 20 || supplier.length > 150) {
    return NextResponse.json({ error: 'Enter a non-negative quantity and cost, plus valid unit and supplier values.' }, { status: 400 });
  }
  if (!isDate(purchaseDate) || !isDate(expiryDate) || expiryDate < purchaseDate) {
    return NextResponse.json({ error: 'Enter valid purchase and expiry dates; expiry cannot be before purchase.' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `UPDATE inventory_batches
       SET quantity = $1, unit = $2, purchase_date = $3, expiry_date = $4, cost_per_unit = $5, supplier = $6
       WHERE id = $7
       RETURNING id, product_id`,
      [quantity, unit, purchaseDate, expiryDate, cost, supplier, id]
    );
    if (!result.rowCount) return NextResponse.json({ error: 'Inventory batch was not found.' }, { status: 404 });
    await logEvent('inventory_batch_updated', {
      batchId: result.rows[0].id,
      productId: result.rows[0].product_id,
      quantity,
      unit
    }, { entityType: 'inventory_batch', entityId: result.rows[0].id });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('Could not update inventory batch:', error);
    return NextResponse.json({ error: 'Could not update inventory. Check the submitted values and database setup.' }, { status: 500 });
  }
}
