-- Migration 017: System Enhancements
-- Adds: deleted_at timestamps, animal_type, cage booking system, card payment fields

-- ==========================================
-- 1. RECYCLE BIN ENHANCEMENTS
-- ==========================================

-- Add deleted_at timestamp to all soft-delete tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ==========================================
-- 2. APPOINTMENTS - ANIMAL TYPE
-- ==========================================

-- Add animal_type to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS animal_type VARCHAR(50);

-- ==========================================
-- 3. CAGE BOOKING SYSTEM
-- ==========================================

-- Cage configuration table
CREATE TABLE IF NOT EXISTS cage_settings (
  id SERIAL PRIMARY KEY,
  total_cages INTEGER NOT NULL DEFAULT 10,
  cage_prefix VARCHAR(10) DEFAULT 'C',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default cage settings if not exists
INSERT INTO cage_settings (total_cages, cage_prefix)
SELECT 10, 'C'
WHERE NOT EXISTS (SELECT 1 FROM cage_settings LIMIT 1);

-- Cage bookings table
CREATE TABLE IF NOT EXISTS cage_bookings (
  id SERIAL PRIMARY KEY,
  cage_number INTEGER NOT NULL,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
  boarding_stay_id INTEGER REFERENCES boarding_stays(id) ON DELETE SET NULL,
  pet_name VARCHAR(200),
  client_name VARCHAR(200),
  animal_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'booked',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for cage availability queries
CREATE INDEX IF NOT EXISTS idx_cage_bookings_dates ON cage_bookings(cage_number, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_cage_bookings_status ON cage_bookings(status);

-- Add cage_number to boarding_stays if not exists
ALTER TABLE boarding_stays ADD COLUMN IF NOT EXISTS cage_number INTEGER;

-- ==========================================
-- 4. CARD PAYMENT FIELDS
-- ==========================================

-- Add card payment details to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS card_last_four VARCHAR(4);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS card_type VARCHAR(20);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS card_approval_code VARCHAR(50);

-- ==========================================
-- 5. TRIGGERS
-- ==========================================

-- Trigger to auto-update updated_at on cage_settings
DROP TRIGGER IF EXISTS set_cage_settings_updated_at ON cage_settings;
CREATE TRIGGER set_cage_settings_updated_at
  BEFORE UPDATE ON cage_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger to auto-update updated_at on cage_bookings
DROP TRIGGER IF EXISTS set_cage_bookings_updated_at ON cage_bookings;
CREATE TRIGGER set_cage_bookings_updated_at
  BEFORE UPDATE ON cage_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
