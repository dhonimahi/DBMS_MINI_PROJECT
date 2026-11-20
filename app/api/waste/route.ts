// Import Next.js request and response utilities for this endpoint.
import { NextRequest, NextResponse } from 'next/server';
// Import the PostgreSQL query helper and the pool used to borrow a transaction connection.
import { query, pool } from '@/lib/db';
// Import the MongoDB event writer.
import { logEvent } from '@/lib/mongo';
// Import the role check and the common authorization error response.
import { checkApiAccess } from '@/lib/account';

// Describe the incoming waste fields before validation.
type WasteInput = {
  // Accept an unvalidated product reference.
  product_id?: unknown;
  // Accept an unvalidated disposal quantity.
  quantity?: unknown;
  // Accept an unvalidated disposal reason.
  reason?: unknown;
  // Accept an unvalidated monetary estimate.
  estimated_loss?: unknown;
  // Accept unvalidated notes.
  notes?: unknown;
// Finish the waste input type.
};

// Identify a JSON object before reading its fields.
function isObject(value: unknown): value is WasteInput {
  // Require a non-null object and exclude arrays.
  return typeof value === 'object' && value !== null && !Array.isArray(value);
// End the object check.
}

// Handle an HTTP GET for waste history.
export async function GET() {
  const denied = await checkApiAccess();
  if (denied) return denied;
  // Catch query failures.
  try {
    // Line 53 — Read waste history through the shared PostgreSQL pool.
    // Line 54 — Select identifiers, product name, waste quantity and disposal reason.
    // Line 55 — Read loss, date, notes and the batch unit if available, falling back to an inferred unit.
    // Line 56 — Read waste rows using the alias w.
    // Line 57 — Join each waste row to its product to get the name.
    // Line 58 — Use a left join so waste remains visible when its batch link is missing.
    // Line 59 — Use a correlated subquery to look for a consistent product unit.
    // Line 60 — Return the single unit value using MIN once the HAVING condition is met.
    // Line 61 — Look at inventory batch units.
    // Line 62 — Consider only batches for this waste record's product.
    // Line 63 — Infer a unit only when all matching batches use one distinct unit.
    // Line 64 — Keep the waste row even when the subquery cannot infer a unit.
    // Line 65 — Show the most recently recorded waste first.
    // Line 66 — Return at most 200 rows.
    // Line 67 — Finish the history query.
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
    // Send the resulting rows as JSON.
    return NextResponse.json(result.rows);
  // Catch query failures.
  } catch (error) {
    // Log the database error on the server.
    console.error('Could not load waste records:', error);
    // Return a general history error with HTTP 500.
    return NextResponse.json({ error: 'Could not load waste records.' }, { status: 500 });
  // Finish query error handling.
  }
// End the waste history route.
}

// Handle an HTTP POST that records waste.
export async function POST(request: NextRequest) {
  // Enforce permissions against the active account before changing records.
  const denied = await checkApiAccess();
  if (denied) return denied;
  // Keep the body untyped until it has been parsed and checked.
  let body: unknown;
  // Handle malformed JSON from the incoming request.
  try {
    // Decode the request body as JSON.
    body = await request.json();
  // Catch a failure to parse the JSON.
  } catch {
    // Return HTTP 400 with a message about invalid JSON.
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  // Close the JSON parser's error handler.
  }
  // Require an object before reading named fields.
  if (!isObject(body)) {
    // Return HTTP 400 for a null, array or primitive body.
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  // Finish the object check.
  }

  // Convert the submitted product ID to a number.
  const productId = Number(body.product_id);
  // Convert the disposal quantity to a number.
  const quantity = Number(body.quantity);
  // Use zero for missing or empty estimated loss, otherwise convert the submitted estimate.
  const loss = body.estimated_loss === undefined || body.estimated_loss === '' ? 0 : Number(body.estimated_loss);
  // Trim the entered waste reason or use empty text for other types.
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  // Trim the notes or use empty text for other types.
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  // Define the accepted waste reasons.
  const validReasons = ['Expired', 'Spoilage', 'Over-preparation', 'Damaged packaging', 'Unsold food', 'Other'];

  // Require a positive integer product ID and a positive finite disposal quantity.
  if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isFinite(quantity) || quantity <= 0 ||
      // Also check that loss is finite and non-negative, the reason is allowed, and the notes fit.
      !Number.isFinite(loss) || loss < 0 || !validReasons.includes(reason) || notes.length > 2000) {
    // Return HTTP 400 for invalid waste input.
    return NextResponse.json({ error: 'Choose a product and enter valid waste quantity, reason, loss and notes.' }, { status: 400 });
  // Finish waste validation.
  }

  // Borrow one PostgreSQL client to hold the transaction.
  const client = await pool.connect().catch(error => {
    // Log the reason the database connection could not be borrowed.
    console.error('Could not connect to PostgreSQL for waste recording:', error);
    // Return null as a signal that the connection attempt failed.
    return null;
  // Finish attempting to borrow a client.
  });
  // Return HTTP 503 if the database is unavailable.
  if (!client) return NextResponse.json({ error: 'Could not record waste. Check the database connection.' }, { status: 503 });

  // Catch failures while the transaction client is checked out.
  try {
    // Begin the stock deduction and waste insert as one transaction.
    await client.query('BEGIN');
    // Look up and lock the batch that will cover this disposal.
    const batch = await client.query(
      // Line 150 — Select the matching batch's primary key.
      // Line 151 — Search inventory batches.
      // Line 152 — Require the selected product and enough stock in this one batch.
      // Line 153 — Prefer earlier expiry, using the lower ID to break a tie.
      // Line 154 — Select only one eligible batch.
      // Line 155 — Hold a row lock until the transaction ends so competing writes have to wait.
      `SELECT id
       FROM inventory_batches
       WHERE product_id = $1 AND quantity >= $2
       ORDER BY expiry_date ASC, id ASC
       LIMIT 1
       FOR UPDATE`,
      // Bind the product ID and requested quantity to the SQL placeholders.
      [productId, quantity]
    // Finish batch selection.
    );
    // Check whether any one batch can cover the full quantity.
    if (!batch.rows.length) {
      // Roll back immediately when no eligible batch exists.
      await client.query('ROLLBACK');
      // Prepare an error response for the failed stock check.
      return NextResponse.json(
        // Tell the user why the request cannot be recorded.
        { error: 'No single batch has enough stock. Record a smaller quantity or update inventory.' },
        // Use HTTP 409 to report a conflict with current inventory.
        { status: 409 }
      // Send the error response.
      );
    // Finish the insufficient-stock branch.
    }

    // Read the ID of the selected and locked batch.
    const batchId = batch.rows[0].id;
    // Run the stock update on the same transaction client.
    await client.query(
      // Subtract the waste amount from the selected row; this also fires the updated_at trigger.
      'UPDATE inventory_batches SET quantity = quantity - $1 WHERE id = $2',
      // Bind the waste quantity and batch ID.
      [quantity, batchId]
    // Finish the stock update.
    );
    // Create the matching waste history row in the same transaction.
    const waste = await client.query(
      // Line 190 — Name the six fields to be written by the waste insert.
      // Line 191 — Use SQL placeholders for the six submitted or derived values.
      // Line 192 — Return the new waste record ID.
      `INSERT INTO waste_records(product_id, batch_id, quantity, reason, estimated_loss, notes)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      // Bind product, batch, quantity, reason, loss and notes in order.
      [productId, batchId, quantity, reason, loss, notes]
    // Finish the waste insert.
    );
    // Commit the stock deduction and history row together.
    await client.query('COMMIT');
    // After PostgreSQL commits, attempt to insert a waste event in MongoDB.
    await logEvent('waste_recorded', {
      // Put the new waste record ID into the event details.
      wasteId: waste.rows[0].id,
      // Include the product ID.
      productId,
      // Include the batch used for the deduction.
      batchId,
      // Include the quantity discarded.
      quantity,
      // Include the stated disposal reason.
      reason,
      // Include the submitted estimated loss.
      estimatedLoss: loss
    // Link the MongoDB event to the PostgreSQL waste record.
    }, { entityType: 'waste_record', entityId: waste.rows[0].id });
    // Return HTTP 201 with the waste record ID.
    return NextResponse.json({ ok: true, id: waste.rows[0].id }, { status: 201 });
  // Handle unexpected failures from the operation.
  } catch (error) {
    // Attempt to undo any uncommitted writes and log a rollback failure if it occurs.
    await client.query('ROLLBACK').catch(rollbackError => console.error('Waste record rollback failed:', rollbackError));
    // Log the original database error.
    console.error('Could not record waste:', error);
    // Return a general waste save error with HTTP 500.
    return NextResponse.json({ error: 'Could not record waste. Check the submitted values and database setup.' }, { status: 500 });
  // Run cleanup after either success or failure.
  } finally {
    // Return this connection to the pool for reuse.
    client.release();
  // Finish cleanup.
  }
// End the waste creation route.
}
