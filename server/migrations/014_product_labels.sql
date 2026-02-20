-- Product Labels table for unique label code management
-- Each label generated gets a unique code stored in the database

CREATE TABLE IF NOT EXISTS product_labels (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  label_code VARCHAR(100) UNIQUE NOT NULL,
  product_code VARCHAR(50),
  product_name VARCHAR(200),
  selling_price NUMERIC(12,2) DEFAULT 0,
  expiry_date DATE,
  supplier_name VARCHAR(200),
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_labels_product_id ON product_labels(product_id);
CREATE INDEX IF NOT EXISTS idx_product_labels_label_code ON product_labels(label_code);
CREATE INDEX IF NOT EXISTS idx_product_labels_created_at ON product_labels(created_at);

-- Trigger for updated_at
DO $$
BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'product_labels_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER product_labels_set_updated_at
    BEFORE UPDATE ON product_labels
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
