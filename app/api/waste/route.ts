import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { logEvent } from '@/lib/mongo';

type WasteInput = {
  product_id?: unknown;
  quantity?: unknown;
  reason?: unknown;
  estimated_loss?: unknown;
  notes?: unknown;
};

function isObject(value: unknown): value is WasteInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  try {
    const result = await query(`
      SELECT w.id, w.product_id, p.name AS product_name, w.quantity, w.reason,
             w.estimated_loss, w.wasted_at::text, w.notes, COALESCE(b.unit, inferred.unit) AS unit
      FROM waste_records w
      JOIN products p ON p.id = w.product_id
      LEFT JOIN inventory_batches b ON b.id = w.batch_id
      LEFT JOIN LATERAL (
        SELECT MIN(unit) AS unit
        FROM inventory_batches
        WHERE product_id = w.product_id
        HAVING COUNT(DISTINCT unit) = 1
      ) inferred ON TRUE
      ORDER BY w.wasted_at DESC
      LIMIT 200
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Could not load waste records:', error);
    return NextResponse.json({ error: 'Could not load waste records.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!isObject(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  const productId = Number(body.product_id);
  const quantity = Number(body.quantity);
  const loss = body.estimated_loss === undefined || body.estimated_loss === '' ? 0 : Number(body.estimated_loss);
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const validReasons = ['Expired', 'Spoilage', 'Over-preparation', 'Damaged packaging', 'Unsold food', 'Other'];

  if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(loss) || loss < 0 || !validReasons.includes(reason) || notes.length > 2000) {
    return NextResponse.json({ error: 'Choose a product and enter valid waste quantity, reason, loss and notes.' }, { status: 400 });
  }

  const client = await pool.connect().catch(error => {
    console.error('Could not connect to PostgreSQL for waste recording:', error);
    return null;
  });
  if (!client) return NextResponse.json({ error: 'Could not record waste. Check the database connection.' }, { status: 503 });

  try {
    await client.query('BEGIN');
    const batch = await client.query(
      `SELECT id
       FROM inventory_batches
       WHERE product_id = $1 AND quantity >= $2
       ORDER BY expiry_date ASC, id ASC
       LIMIT 1
       FOR UPDATE`,
      [productId, quantity]
    );
    if (!batch.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'No single batch has enough stock. Record a smaller quantity or update inventory.' },
        { status: 409 }
      );
    }

    const batchId = batch.rows[0].id;
    await client.query(
      'UPDATE inventory_batches SET quantity = quantity - $1 WHERE id = $2',
      [quantity, batchId]
    );
    const waste = await client.query(
      `INSERT INTO waste_records(product_id, batch_id, quantity, reason, estimated_loss, notes)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [productId, batchId, quantity, reason, loss, notes]
    );
    await client.query('COMMIT');
    await logEvent('waste_recorded', {
      wasteId: waste.rows[0].id,
      productId,
      batchId,
      quantity,
      reason,
      estimatedLoss: loss
    }, { entityType: 'waste_record', entityId: waste.rows[0].id });
    return NextResponse.json({ ok: true, id: waste.rows[0].id }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK').catch(rollbackError => console.error('Waste record rollback failed:', rollbackError));
    console.error('Could not record waste:', error);
    return NextResponse.json({ error: 'Could not record waste. Check the submitted values and database setup.' }, { status: 500 });
  } finally {
    client.release();
  }
}
