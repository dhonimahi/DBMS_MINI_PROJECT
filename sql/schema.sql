-- FreshTrack database schema (PostgreSQL)
-- Create the table that stores login accounts if it does not already exist.
CREATE TABLE IF NOT EXISTS app_users (
 -- Generate a unique account ID and require a display name.
 id BIGSERIAL PRIMARY KEY, full_name VARCHAR(120) NOT NULL,
 -- Require a unique login email and a stored password hash.
 email VARCHAR(255) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 -- Default new accounts to staff and allow only the two defined roles.
 role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
 -- Give each account a timezone-aware creation timestamp.
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- End the account table definition.
);
-- Upgrade existing accounts in place. Changing the version revokes outstanding login tokens.
ALTER TABLE app_users
 ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
 ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
-- Create one catalog row per distinct product name.
CREATE TABLE IF NOT EXISTS products (
 -- Generate a product ID and enforce uniqueness of names for the inventory upsert.
 id BIGSERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL UNIQUE,
 -- Store the category and timestamp, with defaults for both.
 category VARCHAR(60) NOT NULL DEFAULT 'Other', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- End the product table definition.
);
-- Create the table for individual deliveries or lots.
CREATE TABLE IF NOT EXISTS inventory_batches (
 -- Generate a batch ID and require an existing product; a referenced product cannot be deleted.
 id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 -- Store stock to two decimal places, allow zero stock and default the unit to units.
 quantity NUMERIC(12,2) NOT NULL CHECK (quantity >= 0), unit VARCHAR(20) NOT NULL DEFAULT 'units',
 -- Default purchase to today's date and require an explicit expiry date.
 purchase_date DATE NOT NULL DEFAULT CURRENT_DATE, expiry_date DATE NOT NULL,
 -- Require a non-negative cost and use an empty string when the supplier is unspecified.
 cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0), supplier VARCHAR(150) NOT NULL DEFAULT '',
 -- Initialize both timestamps; the trigger maintains the modification time.
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 -- Reject an expiry date earlier than the purchase date.
 CHECK (expiry_date >= purchase_date)
-- End the batch table definition.
);
-- Create a history table with one row per recorded disposal.
CREATE TABLE IF NOT EXISTS waste_records (
 -- Generate a waste record ID and keep its product reference valid.
 id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 -- Keep the waste record if its batch is deleted by clearing the batch reference.
 batch_id BIGINT REFERENCES inventory_batches(id) ON DELETE SET NULL,
 -- Require a positive waste quantity and a reason.
 quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0), reason VARCHAR(80) NOT NULL,
 -- Store estimated monetary loss to two decimals, with a non-negative default.
 estimated_loss NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_loss >= 0),
 -- Keep optional notes as text and default the disposal time to now.
 notes TEXT NOT NULL DEFAULT '', wasted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- End the waste table definition.
);
-- Index expiry dates for batches that still have stock.
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON inventory_batches(expiry_date) WHERE quantity > 0;
-- Index the product foreign key for batch lookups and joins.
CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id);
-- Index disposal timestamps for recent-waste queries.
CREATE INDEX IF NOT EXISTS idx_waste_date ON waste_records(wasted_at);
-- Index the product foreign key for waste lookups and joins.
CREATE INDEX IF NOT EXISTS idx_waste_product ON waste_records(product_id);
-- Define a saved query that derives expiry classifications when read.
CREATE OR REPLACE VIEW v_inventory_expiry_risk AS
 -- Select the batch ID, product description, quantity, unit and expiry date.
 SELECT b.id AS batch_id,p.name AS product_name,p.category,b.quantity,b.unit,b.expiry_date,
 -- Check already-expired dates first so they get their own label.
 CASE WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
      -- Classify stock expiring today or tomorrow as critical.
      WHEN b.expiry_date <= CURRENT_DATE+1 THEN 'Critical'
      -- After the earlier cases, classify two or three days remaining as high risk.
      WHEN b.expiry_date <= CURRENT_DATE+3 THEN 'High risk'
      -- Classify four to seven days as warning and anything later as safe.
      WHEN b.expiry_date <= CURRENT_DATE+7 THEN 'Warning' ELSE 'Safe' END AS risk_status
 -- Join batches to their product and show only batches with stock.
 FROM inventory_batches b JOIN products p ON p.id=b.product_id WHERE b.quantity>0;
-- Line 76 — Declare the trigger function and open its dollar-quoted body.
-- Line 77 — Set the pending row's updated_at to the current transaction timestamp and return the modified row; use PL/pgSQL for the function body.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
-- Remove the previous trigger definition so the schema can be reapplied.
DROP TRIGGER IF EXISTS trg_batch_updated_at ON inventory_batches;
-- Call the function once per affected batch before its new row is saved.
CREATE TRIGGER trg_batch_updated_at BEFORE UPDATE ON inventory_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Example transaction for the viva: BEGIN; UPDATE inventory_batches SET quantity=quantity-1 WHERE id=1 AND quantity>=1; COMMIT;
