-- FreshTrack database schema (PostgreSQL)
CREATE TABLE IF NOT EXISTS app_users (
 id BIGSERIAL PRIMARY KEY, full_name VARCHAR(120) NOT NULL,
 email VARCHAR(255) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS products (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL UNIQUE,
 category VARCHAR(60) NOT NULL DEFAULT 'Other', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inventory_batches (
 id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 quantity NUMERIC(12,2) NOT NULL CHECK (quantity >= 0), unit VARCHAR(20) NOT NULL DEFAULT 'units',
 purchase_date DATE NOT NULL DEFAULT CURRENT_DATE, expiry_date DATE NOT NULL,
 cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0), supplier VARCHAR(150) NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (expiry_date >= purchase_date)
);
CREATE TABLE IF NOT EXISTS waste_records (
 id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 batch_id BIGINT REFERENCES inventory_batches(id) ON DELETE SET NULL,
 quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0), reason VARCHAR(80) NOT NULL,
 estimated_loss NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_loss >= 0),
 notes TEXT NOT NULL DEFAULT '', wasted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON inventory_batches(expiry_date) WHERE quantity > 0;
CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_waste_date ON waste_records(wasted_at);
CREATE INDEX IF NOT EXISTS idx_waste_product ON waste_records(product_id);
CREATE OR REPLACE VIEW v_inventory_expiry_risk AS
 SELECT b.id AS batch_id,p.name AS product_name,p.category,b.quantity,b.unit,b.expiry_date,
 CASE WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
      WHEN b.expiry_date <= CURRENT_DATE+1 THEN 'Critical'
      WHEN b.expiry_date <= CURRENT_DATE+3 THEN 'High risk'
      WHEN b.expiry_date <= CURRENT_DATE+7 THEN 'Warning' ELSE 'Safe' END AS risk_status
 FROM inventory_batches b JOIN products p ON p.id=b.product_id WHERE b.quantity>0;
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_batch_updated_at ON inventory_batches;
CREATE TRIGGER trg_batch_updated_at BEFORE UPDATE ON inventory_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Example transaction for the viva: BEGIN; UPDATE inventory_batches SET quantity=quantity-1 WHERE id=1 AND quantity>=1; COMMIT;
