CREATE TABLE IF NOT EXISTS sales_returns (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  invoice_no VARCHAR(50),
  total_refund NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id SERIAL PRIMARY KEY,
  sales_return_id INTEGER REFERENCES sales_returns(id) ON DELETE CASCADE,
  sale_item_id INTEGER REFERENCES sale_items(id) ON DELETE SET NULL,
  name VARCHAR(200),
  qty INTEGER DEFAULT 0,
  price NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  invoice_no VARCHAR(50),
  total_refund NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id SERIAL PRIMARY KEY,
  purchase_return_id INTEGER REFERENCES purchase_returns(id) ON DELETE CASCADE,
  purchase_item_id INTEGER REFERENCES purchase_items(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  qty INTEGER DEFAULT 0,
  cost_price NUMERIC(12,2) DEFAULT 0
);
