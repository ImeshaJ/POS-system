-- Migration: Add service_packages and add_on_services tables

CREATE TABLE IF NOT EXISTS service_packages (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  package_id VARCHAR(64),
  name VARCHAR(200) NOT NULL,
  price NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  duration_days INTEGER DEFAULT 0,
  duration_hours INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  service_type VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS add_on_services (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  addon_id VARCHAR(64),
  name VARCHAR(200) NOT NULL,
  price NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  duration_days INTEGER DEFAULT 0,
  duration_hours INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  service_type VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
