CREATE TABLE IF NOT EXISTS vat_rates (
  id SERIAL PRIMARY KEY,
  category VARCHAR(120) NOT NULL,
  description TEXT,
  rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  applicable_from DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vat_rates_status ON vat_rates(status);
CREATE INDEX IF NOT EXISTS idx_vat_rates_applicable_from ON vat_rates(applicable_from);
