// Import Next.js request and response utilities for this endpoint.
import { NextRequest, NextResponse } from 'next/server';
// Import the PostgreSQL query helper and the pool used to borrow a transaction connection.
import { query, pool } from '@/lib/db';
// Import the MongoDB event writer.
import { logEvent } from '@/lib/mongo';
// Import the role check and the common authorization error response.
import { checkApiAccess } from '@/lib/account';

// Describe the accepted inventory fields before validation.
type InventoryInput = {
  // Accept an unvalidated product name.
  name?: unknown;
  // Accept an unvalidated category.
  category?: unknown;
  // Accept an unvalidated starting quantity.
  quantity?: unknown;
  // Accept an unvalidated measurement unit.
  unit?: unknown;
  // Accept an unvalidated purchase date.
  purchase_date?: unknown;
  // Accept an unvalidated expiry date.
  expiry_date?: unknown;
  // Accept an unvalidated cost per unit.
  cost_per_unit?: unknown;
  // Accept an unvalidated supplier name.
  supplier?: unknown;
// Finish the input type.
};

// Define a check that narrows the unknown value to an inventory object.
function isObject(value: unknown): value is InventoryInput {
  // Accept a non-null object and exclude arrays.
  return typeof value === 'object' && value !== null && !Array.isArray(value);
// End the object check.
}

// Define a calendar-date check that narrows the value to a string.
function isDate(value: unknown): value is string {
  // Require the exact YYYY-MM-DD format before parsing.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Parse the supplied date at midnight UTC.
  const date = new Date(`${value}T00:00:00Z`);
  // Check validity and compare the formatted result to reject dates that would roll into another day.
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
// End the date check.
}

// Provide a helper for cleaning text fields.
function text(value: unknown, fallback = '') {
  // Trim strings and use the fallback for other input types.
  return typeof value === 'string' ? value.trim() : fallback;
// End the text helper.
}

// Normalize the form input and check it before writing to the database.
function parseValues(input: InventoryInput) {
  // Trim the product name.
  const name = text(input.name);
  // Trim the category and use Other when it is missing or empty.
  const category = text(input.category, 'Other') || 'Other';
  // Trim the unit and use units when it is missing or empty.
  const unit = text(input.unit, 'units') || 'units';
  // Trim the supplier name or use empty text.
  const supplier = text(input.supplier);
  // Convert the form quantity to a number.
  const quantity = Number(input.quantity);
  // Default blank cost to zero and convert other values to numbers.
  const cost = input.cost_per_unit === undefined || input.cost_per_unit === '' ? 0 : Number(input.cost_per_unit);
  // Check whether the purchase date needs a default.
  const purchaseDate = input.purchase_date === undefined || input.purchase_date === ''
    // Use today's UTC date as YYYY-MM-DD when no purchase date is supplied.
    ? new Date().toISOString().slice(0, 10)
    // Otherwise use the submitted purchase date.
    : input.purchase_date;
  // Read the required expiry date for validation.
  const expiryDate = input.expiry_date;

  // Require a name and enforce the text lengths supported by the schema.
  if (!name || name.length > 150 || category.length > 60 || unit.length > 20 || supplier.length > 150) {
    // Return a readable message for invalid text fields.
    return { error: 'Enter a product name and valid category, unit and supplier lengths.' } as const;
  // Finish checking the text fields.
  }
  // Require a positive finite opening quantity and non-negative finite cost.
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(cost) || cost < 0) {
    // Return a readable message for invalid numeric fields.
    return { error: 'Enter a positive quantity and a non-negative cost.' } as const;
  // Finish checking the numeric fields.
  }
  // Require both calendar dates and reject expiry before purchase.
  if (!isDate(purchaseDate) || !isDate(expiryDate) || expiryDate < purchaseDate) {
    // Return a readable message for invalid dates.
    return { error: 'Enter valid purchase and expiry dates; expiry cannot be before purchase.' } as const;
  // Finish checking the dates.
  }

  // Return only the normalized values on success.
  return { values: { name, category, quantity, unit, purchaseDate, expiryDate, cost, supplier } } as const;
// End inventory validation.
}

// Handle an HTTP GET for the inventory list.
export async function GET() {
  const denied = await checkApiAccess();
  if (denied) return denied;
  // Catch errors from the database read.
  try {
    // Line 116 — Run a read query through the shared pool.
    // Line 117 — Select batch and product IDs, product name and category, and remaining stock and its unit.
    // Line 118 — Return both dates as text with the cost and supplier.
    // Line 119 — Read from the batch table using the alias b.
    // Line 120 — Join each batch to its product by the foreign key.
    // Line 121 — List the earliest expiring batches first.
    // Line 122 — Finish the SQL query.
    const result = await query(`
      SELECT b.id, b.product_id, p.name AS product_name, p.category, b.quantity, b.unit,
             b.purchase_date::text, b.expiry_date::text, b.cost_per_unit, b.supplier
      FROM inventory_batches b
      JOIN products p ON p.id = b.product_id
      ORDER BY b.expiry_date ASC
    `);
    // Send the rows as JSON.
    return NextResponse.json(result.rows);
  // Handle any query failure.
  } catch (error) {
    // Record the database error in the server log.
    console.error('Could not load inventory:', error);
    // Return a general inventory-load error with HTTP 500.
    return NextResponse.json({ error: 'Could not load inventory. Check database setup.' }, { status: 500 });
  // Finish handling errors.
  }
// End the inventory read route.
}

// Handle an HTTP POST that creates an inventory batch.
export async function POST(request: NextRequest) {
  // Enforce permissions against the active account before changing records.
  const denied = await checkApiAccess('admin');
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

  // Normalize and validate the inventory object.
  const parsed = parseValues(body);
  // Return the validation message with HTTP 400 before opening a transaction.
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  // Extract the cleaned values used by the SQL statements.
  const { name, category, quantity, unit, purchaseDate, expiryDate, cost, supplier } = parsed.values;
  // Borrow one pooled client for the entire transaction.
  const client = await pool.connect().catch(error => {
    // Log the connection failure for troubleshooting.
    console.error('Could not connect to PostgreSQL for inventory creation:', error);
    // Use null to tell the next line that no client was borrowed.
    return null;
  // Finish the connection attempt.
  });
  // Return HTTP 503 if PostgreSQL cannot supply a connection.
  if (!client) return NextResponse.json({ error: 'Could not save inventory. Check the database connection.' }, { status: 503 });

  // Handle failures while the client is checked out.
  try {
    // Begin a transaction for the product and batch writes.
    await client.query('BEGIN');
    // Run the product upsert before creating the batch.
    const product = await client.query(
      // Line 186 — Insert the product name and category as parameter values.
      // Line 187 — If the name already exists, update its category using the submitted value.
      // Line 188 — Return the product ID in either case.
      `INSERT INTO products(name, category) VALUES($1, $2)
       ON CONFLICT(name) DO UPDATE SET category = EXCLUDED.category
       RETURNING id`,
      // Bind the name and category to the two SQL placeholders.
      [name, category]
    // Finish the upsert.
    );
    // Insert the batch in the same transaction.
    const batch = await client.query(
      // Line 197 — Choose the batch fields, including the product foreign key.
      // Line 198 — Bind the seven values and request the generated batch ID.
      `INSERT INTO inventory_batches(product_id, quantity, unit, purchase_date, expiry_date, cost_per_unit, supplier)
       VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      // Pass the product ID returned by the upsert followed by the cleaned batch fields.
      [product.rows[0].id, quantity, unit, purchaseDate, expiryDate, cost, supplier]
    // Finish the batch insert.
    );
    // Commit both SQL writes together.
    await client.query('COMMIT');
    // Attempt to record the activity in MongoDB after committing PostgreSQL.
    await logEvent(
      // Label the event as batch creation.
      'inventory_batch_created',
      // Include the batch ID, product name, quantity and unit in the event details.
      { batchId: batch.rows[0].id, product: name, quantity, unit },
      // Link the event to the newly created batch.
      { entityType: 'inventory_batch', entityId: batch.rows[0].id }
    // Finish logging the event.
    );
    // Respond with HTTP 201 and the new batch ID.
    return NextResponse.json({ ok: true, id: batch.rows[0].id }, { status: 201 });
  // Handle failures from the save flow.
  } catch (error) {
    // Attempt to roll back the PostgreSQL transaction and log a rollback failure if one occurs.
    await client.query('ROLLBACK').catch(rollbackError => console.error('Inventory create rollback failed:', rollbackError));
    // Log the original error on the server.
    console.error('Could not create inventory batch:', error);
    // Return a general save error with HTTP 500.
    return NextResponse.json({ error: 'Could not save inventory. Check the submitted values and database setup.' }, { status: 500 });
  // Run cleanup whether the create succeeded or failed.
  } finally {
    // Return the checked-out client to the PostgreSQL pool.
    client.release();
  // Finish cleanup.
  }
// End the inventory create route.
}
