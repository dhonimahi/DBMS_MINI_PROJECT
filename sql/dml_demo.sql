-- Safe INSERT/UPDATE/DELETE demonstration using temporary sample rows only.
-- The final ROLLBACK removes the demonstration data; do not replace it with COMMIT.
-- Start the demonstration transaction.
BEGIN;

-- Create a temporary table to remember the IDs of only the rows created here.
CREATE TEMP TABLE freshtrack_demo_keys (
  -- Hold the ID of the demonstration batch.
  batch_id BIGINT,
  -- Hold the ID of the demonstration product.
  product_id BIGINT
-- End the definition and drop the temporary table automatically if the transaction commits.
) ON COMMIT DROP;

-- Start a named query that creates the demonstration product.
WITH created_product AS (
  -- Choose the product columns being inserted.
  INSERT INTO products(name, category)
  -- Build a distinct demo name from a time and random hash and set category to Other.
  VALUES ('SQL demo ' || md5(clock_timestamp()::text || random()::text), 'Other')
  -- Return the new ID for the next named query.
  RETURNING id
-- Finish the product query and separate it from the batch query.
),
-- Start a named query that creates the demonstration batch.
created_batch AS (
  -- Choose the batch columns being inserted.
  INSERT INTO inventory_batches(product_id, quantity, unit, purchase_date, expiry_date, supplier)
  -- Use the new product ID with three units purchased and expiring today.
  SELECT id, 3, 'units', CURRENT_DATE, CURRENT_DATE, 'SQL demonstration'
  -- Read the product ID returned by the preceding insert.
  FROM created_product
  -- Return the batch and product IDs for the final insert.
  RETURNING id, product_id
-- Finish the batch query.
)
-- Store the temporary keys so later updates and deletes can target them.
INSERT INTO freshtrack_demo_keys(batch_id, product_id)
-- Read both IDs from the newly created batch.
SELECT id, product_id FROM created_batch;

-- Modify the inventory batch table.
UPDATE inventory_batches
-- Deduct one unit from the matched demonstration batch.
SET quantity = quantity - 1
-- Restrict the update to IDs saved by the demo.
WHERE id IN (SELECT batch_id FROM freshtrack_demo_keys)
-- Show the ID and updated quantity.
RETURNING id, quantity;

-- Remove the demonstration batch before removing its referenced product.
DELETE FROM inventory_batches
-- Delete only the batch identified in the temporary table.
WHERE id IN (SELECT batch_id FROM freshtrack_demo_keys)
-- Show the deleted batch ID.
RETURNING id;

-- Remove the demonstration product after the dependent batch is gone.
DELETE FROM products
-- Delete only the product identified in the temporary table.
WHERE id IN (SELECT product_id FROM freshtrack_demo_keys)
-- Show the deleted product ID.
RETURNING id;

-- Undo all demo data changes and the temporary table creation.
ROLLBACK;
