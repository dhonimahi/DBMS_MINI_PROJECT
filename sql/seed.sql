-- Sample data for demonstration. Run after schema.sql.
INSERT INTO products(name,category) VALUES
 ('Fresh Milk','Dairy'),('Whole Wheat Bread','Bakery'),('Tomatoes','Vegetables'),('Apples','Fruits')
ON CONFLICT(name) DO NOTHING;
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
SELECT id,20,'litres',CURRENT_DATE-1,CURRENT_DATE+1,28,'City Dairy' FROM products WHERE name='Fresh Milk'
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='City Dairy');
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
SELECT id,15,'packets',CURRENT_DATE-1,CURRENT_DATE+2,35,'Daily Bake' FROM products WHERE name='Whole Wheat Bread'
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='Daily Bake');
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
SELECT id,10,'kg',CURRENT_DATE-2,CURRENT_DATE+3,40,'Fresh Market' FROM products WHERE name='Tomatoes'
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='Fresh Market');
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
SELECT id,12,'kg',CURRENT_DATE-3,CURRENT_DATE+6,120,'Fresh Market' FROM products WHERE name='Apples'
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='Fresh Market');
-- Example waste data for the dashboard. Safe to run repeatedly only if no matching notes row exists.
INSERT INTO waste_records(product_id,batch_id,quantity,reason,estimated_loss,notes,wasted_at)
SELECT p.id,b.id,2,'Spoilage',56,'Sample demonstration record',NOW()-INTERVAL '5 days'
FROM products p
JOIN inventory_batches b ON b.product_id=p.id AND b.supplier='City Dairy'
WHERE p.name='Fresh Milk'
AND NOT EXISTS(SELECT 1 FROM waste_records WHERE notes='Sample demonstration record');
