-- Table for storing surgery case details
CREATE TABLE IF NOT EXISTS surgery_cases (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  fasting_confirmed BOOLEAN DEFAULT FALSE,
  bloodwork_done BOOLEAN DEFAULT FALSE,
  consent_signed BOOLEAN DEFAULT FALSE,
  implants_ready BOOLEAN DEFAULT FALSE,
  notes TEXT,
  anesthesia_plan TEXT,
  recovery_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing physiotherapy session details
CREATE TABLE IF NOT EXISTS physiotherapy_sessions (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  assessment_summary TEXT,
  modalities_applied TEXT,
  home_exercise_plan TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing physiotherapy session history (optional, for tracking changes)
CREATE TABLE IF NOT EXISTS physiotherapy_session_history (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES physiotherapy_sessions(id) ON DELETE CASCADE,
  detail JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);