-- 1. JOIN: inventory batch details
SELECT p.name,b.quantity,b.unit,b.expiry_date FROM products p JOIN inventory_batches b ON b.product_id=p.id ORDER BY b.expiry_date;
-- 2. GROUP BY + aggregate: waste by product
SELECT p.name,SUM(w.quantity) AS total_wasted,SUM(w.estimated_loss) AS total_loss FROM products p JOIN waste_records w ON w.product_id=p.id GROUP BY p.name ORDER BY total_wasted DESC;
-- 3. HAVING: products with more than 2 units wasted
SELECT p.name,SUM(w.quantity) AS total_wasted FROM products p JOIN waste_records w ON w.product_id=p.id GROUP BY p.name HAVING SUM(w.quantity)>2;
-- 4. Subquery: products whose waste exceeds average record quantity
SELECT p.name FROM products p WHERE p.id IN (SELECT product_id FROM waste_records GROUP BY product_id HAVING SUM(quantity)>(SELECT AVG(total_qty) FROM (SELECT SUM(quantity) AS total_qty FROM waste_records GROUP BY product_id) q));
-- 5. View
SELECT * FROM v_inventory_expiry_risk ORDER BY expiry_date;
-- 6. Index demonstration (planner may choose a sequential scan for tiny sample data)
EXPLAIN ANALYZE SELECT * FROM inventory_batches WHERE expiry_date<=CURRENT_DATE+7 AND quantity>0;
-- 7. Safe transaction demonstration. The update is deliberately rolled back so
-- running this example never changes inventory.
BEGIN;
UPDATE inventory_batches
SET quantity=quantity-1
WHERE id=(SELECT id FROM inventory_batches WHERE quantity>=1 ORDER BY id LIMIT 1)
  AND quantity>=1
RETURNING id,quantity;
ROLLBACK;
-- 8. NoSQL aggregation (run in mongosh against smart_food_waste)
-- db.inventory_events.aggregate([{$group:{_id:'$type',count:{$sum:1}}},{$sort:{count:-1}}])
