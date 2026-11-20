// Import Next.js request and response utilities for this endpoint.
import { NextRequest, NextResponse } from 'next/server';
// Import the PostgreSQL pool used for the single batch update.
import { pool } from '@/lib/db';
// Import the MongoDB event writer.
import { logEvent } from '@/lib/mongo';
// Import the role check and the common authorization error response.
import { checkApiAccess } from '@/lib/account';

// Describe the editable batch fields before validation.
type InventoryUpdate = {
  // Accept an unvalidated quantity.
  quantity?: unknown;
  // Accept an unvalidated unit.
  unit?: unknown;
  // Accept an unvalidated purchase date.
  purchase_date?: unknown;
  // Accept an unvalidated expiry date.
  expiry_date?: unknown;
  // Accept an unvalidated unit cost.
  cost_per_unit?: unknown;
  // Accept an unvalidated supplier name.
  supplier?: unknown;
// Finish the update input type.
};

// Define a check that narrows the body to an update object.
function isObject(value: unknown): value is InventoryUpdate {
  // Require a non-null object and exclude arrays.
  return typeof value === 'object' && value !== null && !Array.isArray(value);
// End the object check.
}

// Define a check for a real calendar date.
function isDate(value: unknown): value is string {
  // Require the exact YYYY-MM-DD string format before parsing.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Parse the date at midnight UTC.
  const date = new Date(`${value}T00:00:00Z`);
  // Require the parsed date to match the submitted date when formatted again.
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
// End the date check.
}

// Handle a PATCH to the inventory route for one batch ID.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // Enforce permissions against the active account before changing records.
  const denied = await checkApiAccess('admin');
  if (denied) return denied;
  // Convert the ID from the URL to a number.
  const id = Number(params.id);
  // Require a positive safe integer ID.
  if (!Number.isSafeInteger(id) || id < 1) {
    // Return HTTP 400 if the path ID is invalid.
    return NextResponse.json({ error: 'Inventory batch ID is invalid.' }, { status: 400 });
  // End batch ID validation.
  }

  // Keep the body untyped before validation.
  let body: unknown;
  // Attempt to parse the incoming JSON.
  try {
    // Read the submitted batch fields.
    body = await request.json();
  // Catch a malformed JSON body.
  } catch {
    // Return HTTP 400 for malformed JSON.
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  // Finish handling parse failures.
  }
  // Check that the parsed body is an object.
  if (!isObject(body)) {
    // Return HTTP 400 for a null, array or primitive body.
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  // Finish checking the body shape.
  }

  // Convert the submitted quantity to a number.
  const quantity = Number(body.quantity);
  // Use zero for missing or empty cost and convert other values to numbers.
  const cost = body.cost_per_unit === undefined || body.cost_per_unit === '' ? 0 : Number(body.cost_per_unit);
  // Trim a string unit and default other types to empty text.
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  // Trim a string supplier and default other types to empty text.
  const supplier = typeof body.supplier === 'string' ? body.supplier.trim() : '';
  // Read the submitted purchase date.
  const purchaseDate = body.purchase_date;
  // Read the submitted expiry date.
  const expiryDate = body.expiry_date;

  // Allow zero stock when editing and require finite, non-negative numbers.
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(cost) || cost < 0 ||
      // Also require a unit and enforce the unit and supplier text lengths.
      !unit || unit.length > 20 || supplier.length > 150) {
    // Return HTTP 400 if a numeric or text field fails validation.
    return NextResponse.json({ error: 'Enter a non-negative quantity and cost, plus valid unit and supplier values.' }, { status: 400 });
  // Finish validating the numeric and text fields.
  }
  // Require both actual dates and a valid purchase-to-expiry order.
  if (!isDate(purchaseDate) || !isDate(expiryDate) || expiryDate < purchaseDate) {
    // Return HTTP 400 for an invalid date or date order.
    return NextResponse.json({ error: 'Enter valid purchase and expiry dates; expiry cannot be before purchase.' }, { status: 400 });
  // Finish validating dates.
  }

  // Catch any failure while updating the batch.
  try {
    // Run the SQL update through the shared pool.
    const result = await pool.query(
      // Line 114 — Update the inventory batch table.
      // Line 115 — Replace the batch fields with bound parameter values; the database trigger also sets updated_at.
      // Line 116 — Match the batch ID from the URL.
      // Line 117 — Return the saved batch ID and its product reference.
      `UPDATE inventory_batches
       SET quantity = $1, unit = $2, purchase_date = $3, expiry_date = $4, cost_per_unit = $5, supplier = $6
       WHERE id = $7
       RETURNING id, product_id`,
      // Bind the cleaned fields and target ID to the placeholders in order.
      [quantity, unit, purchaseDate, expiryDate, cost, supplier, id]
    // Finish the update.
    );
    // Return HTTP 404 if no row matched the requested ID.
    if (!result.rowCount) return NextResponse.json({ error: 'Inventory batch was not found.' }, { status: 404 });
    // Log a MongoDB event after updating the PostgreSQL batch.
    await logEvent('inventory_batch_updated', {
      // Store the ID of the updated batch in the event details.
      batchId: result.rows[0].id,
      // Store the product ID returned by PostgreSQL.
      productId: result.rows[0].product_id,
      // Include the new quantity.
      quantity,
      // Include the unit of the new quantity.
      unit
    // Link the event to the inventory batch.
    }, { entityType: 'inventory_batch', entityId: result.rows[0].id });
    // Return success with the batch ID.
    return NextResponse.json({ ok: true, id });
  // Handle any unexpected save failure.
  } catch (error) {
    // Log the underlying error on the server.
    console.error('Could not update inventory batch:', error);
    // Return a general update failure with HTTP 500.
    return NextResponse.json({ error: 'Could not update inventory. Check the submitted values and database setup.' }, { status: 500 });
  // Finish handling errors.
  }
// End the update handler.
}
