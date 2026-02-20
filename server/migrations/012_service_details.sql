-- Migration: Add service detail tables for grooming, boarding, and hospitalization

-- Table for storing grooming session details
CREATE TABLE IF NOT EXISTS grooming_sessions (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  coat_condition VARCHAR(50),
  skin_issues TEXT,
  grooming_type VARCHAR(100),
  services_performed TEXT,
  products_used TEXT,
  next_grooming_date DATE,
  special_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing boarding stay details
CREATE TABLE IF NOT EXISTS boarding_stays (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  check_in_date DATE,
  check_in_time TIME,
  check_out_date DATE,
  check_out_time TIME,
  vaccination_complete BOOLEAN DEFAULT FALSE,
  dewormed_complete BOOLEAN DEFAULT FALSE,
  has_lice BOOLEAN DEFAULT FALSE,
  has_allergy BOOLEAN DEFAULT FALSE,
  stay_items TEXT,
  allergy_notes TEXT,
  health_concerns TEXT,
  feeding_instructions TEXT,
  emergency_contact VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing hospitalization case details
CREATE TABLE IF NOT EXISTS hospitalization_cases (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  admission_date DATE,
  admission_time TIME,
  discharge_date DATE,
  discharge_time TIME,
  diagnosis TEXT,
  treatment_plan TEXT,
  medications TEXT,
  vitals_on_admission TEXT,
  cage_number VARCHAR(50),
  isolation_required BOOLEAN DEFAULT FALSE,
  iv_fluids_required BOOLEAN DEFAULT FALSE,
  oxygen_support BOOLEAN DEFAULT FALSE,
  special_diet TEXT,
  daily_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_grooming_sessions_appointment_id ON grooming_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_boarding_stays_appointment_id ON boarding_stays(appointment_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_cases_appointment_id ON hospitalization_cases(appointment_id);
CREATE INDEX IF NOT EXISTS idx_surgery_cases_appointment_id ON surgery_cases(appointment_id);
CREATE INDEX IF NOT EXISTS idx_physiotherapy_sessions_appointment_id ON physiotherapy_sessions(appointment_id);
