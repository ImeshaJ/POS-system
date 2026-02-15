CREATE TABLE IF NOT EXISTS supplier_due_payments (
  id SERIAL PRIMARY KEY,
  supplier_due_id INTEGER REFERENCES supplier_dues(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference VARCHAR(100)
);
