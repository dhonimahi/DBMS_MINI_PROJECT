-- Safe INSERT/UPDATE/DELETE demonstration using temporary sample rows only.
-- The final ROLLBACK removes the demonstration data; do not replace it with COMMIT.
BEGIN;

CREATE TEMP TABLE freshtrack_demo_keys (
  batch_id BIGINT,
  product_id BIGINT
) ON COMMIT DROP;

WITH created_product AS (
  INSERT INTO products(name, category)
  VALUES ('SQL demo ' || md5(clock_timestamp()::text || random()::text), 'Other')
  RETURNING id
),
created_batch AS (
  INSERT INTO inventory_batches(product_id, quantity, unit, purchase_date, expiry_date, supplier)
  SELECT id, 3, 'units', CURRENT_DATE, CURRENT_DATE, 'SQL demonstration'
  FROM created_product
  RETURNING id, product_id
)
INSERT INTO freshtrack_demo_keys(batch_id, product_id)
SELECT id, product_id FROM created_batch;

UPDATE inventory_batches
SET quantity = quantity - 1
WHERE id IN (SELECT batch_id FROM freshtrack_demo_keys)
RETURNING id, quantity;

DELETE FROM inventory_batches
WHERE id IN (SELECT batch_id FROM freshtrack_demo_keys)
RETURNING id;

DELETE FROM products
WHERE id IN (SELECT product_id FROM freshtrack_demo_keys)
RETURNING id;

ROLLBACK;
