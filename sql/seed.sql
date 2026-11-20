-- Sample data for demonstration. Run after schema.sql.
-- List the product columns populated by the seed script.
INSERT INTO products(name,category) VALUES
 -- Seed four products with a name and category each.
 ('Fresh Milk','Dairy'),('Whole Wheat Bread','Bakery'),('Tomatoes','Vegetables'),('Apples','Fruits')
-- Skip products already present under the same name.
ON CONFLICT(name) DO NOTHING;
-- Declare the columns for the milk delivery.
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
-- Look up the milk ID and seed 20 litres that expire tomorrow.
SELECT id,20,'litres',CURRENT_DATE-1,CURRENT_DATE+1,28,'City Dairy' FROM products WHERE name='Fresh Milk'
-- Skip the milk batch if the same product already has a City Dairy batch.
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='City Dairy');
-- Declare the columns for the bread delivery.
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
-- Seed 15 bread packets that expire in two days.
SELECT id,15,'packets',CURRENT_DATE-1,CURRENT_DATE+2,35,'Daily Bake' FROM products WHERE name='Whole Wheat Bread'
-- Skip the bread batch if the same product already has a Daily Bake batch.
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='Daily Bake');
-- Declare the columns for the tomato delivery.
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
-- Seed 10 kg of tomatoes that expire in three days.
SELECT id,10,'kg',CURRENT_DATE-2,CURRENT_DATE+3,40,'Fresh Market' FROM products WHERE name='Tomatoes'
-- Skip an existing tomato batch from Fresh Market.
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='Fresh Market');
-- Declare the columns for the apple delivery.
INSERT INTO inventory_batches(product_id,quantity,unit,purchase_date,expiry_date,cost_per_unit,supplier)
-- Seed 12 kg of apples that expire in six days.
SELECT id,12,'kg',CURRENT_DATE-3,CURRENT_DATE+6,120,'Fresh Market' FROM products WHERE name='Apples'
-- Skip an existing apple batch from Fresh Market.
AND NOT EXISTS(SELECT 1 FROM inventory_batches b WHERE b.product_id=products.id AND b.supplier='Fresh Market');
-- Example waste data for the dashboard. Safe to run repeatedly only if no matching notes row exists.
-- Declare the waste columns supplied by this standalone seed insert.
INSERT INTO waste_records(product_id,batch_id,quantity,reason,estimated_loss,notes,wasted_at)
-- Create a spoilage example for quantity 2 and loss 56, dated five days ago.
SELECT p.id,b.id,2,'Spoilage',56,'Sample demonstration record',NOW()-INTERVAL '5 days'
-- Start from the product catalog to locate the correct product ID.
FROM products p
-- Get a matching milk batch from City Dairy for its batch ID.
JOIN inventory_batches b ON b.product_id=p.id AND b.supplier='City Dairy'
-- Restrict the sample record to Fresh Milk.
WHERE p.name='Fresh Milk'
-- Insert only if the marker note is not already present; this seed insert does not deduct stock.
AND NOT EXISTS(SELECT 1 FROM waste_records WHERE notes='Sample demonstration record');

-- Demo authentication accounts. Replace these passwords before public deployment.
-- Name the fields for the two demo user accounts.
INSERT INTO app_users(full_name,email,password_hash,role) VALUES
 -- Seed the demo administrator with a precomputed bcrypt hash.
 ('FreshTrack Admin','admin@freshtrack.local','$2a$10$trwkbIFnizdpZTpj0fPlSetA3APmdS9GQ09WhLEtGS5Z03iDJNaD2','admin'),
 -- Seed the demo staff member with a precomputed bcrypt hash.
 ('FreshTrack Staff','staff@freshtrack.local','$2a$10$VRRVRiTrM6XuKayxmwcKNemky6N2U93Ysf0mKrnbV8fgN5bN2u6a6','staff')
-- Preserve credentials and permissions already managed by the administrator.
ON CONFLICT(email) DO NOTHING;
