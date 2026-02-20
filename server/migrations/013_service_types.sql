-- Migration: Add service_types table and update relationships

-- Create service_types table for predefined service categories
CREATE TABLE IF NOT EXISTS service_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert predefined service types
INSERT INTO service_types (code, name, description, icon, color, display_order) VALUES
  ('pet-grooming', 'Pet Grooming', 'Professional grooming services including bathing, trimming, and styling', 'Scissors', 'emerald', 1),
  ('cat-boarding', 'Cat Boarding', 'Safe and comfortable boarding facilities for cats', 'Home', 'indigo', 2),
  ('surgery', 'Surgery Programs', 'Surgical procedures and operative care', 'Stethoscope', 'blue', 3),
  ('physiotherapy', 'Physiotherapy', 'Rehabilitation and physical therapy services', 'Activity', 'purple', 4),
  ('hospitalization', 'Hospitalization', 'In-patient care and medical monitoring', 'Building', 'rose', 5),
  ('vaccination', 'Vaccination', 'Preventive vaccination and immunization services', 'Syringe', 'cyan', 6),
  ('consultation', 'Consultation', 'General veterinary consultation and checkups', 'ClipboardList', 'amber', 7)
ON CONFLICT (code) DO NOTHING;

-- Add service_type_id to service_packages if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_packages' AND column_name = 'service_type_id') THEN
    ALTER TABLE service_packages ADD COLUMN service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add service_type_id to add_on_services if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'add_on_services' AND column_name = 'service_type_id') THEN
    ALTER TABLE add_on_services ADD COLUMN service_type_id INTEGER REFERENCES service_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_packages_type_id ON service_packages(service_type_id);
CREATE INDEX IF NOT EXISTS idx_add_on_services_type_id ON add_on_services(service_type_id);
CREATE INDEX IF NOT EXISTS idx_service_types_code ON service_types(code);
CREATE INDEX IF NOT EXISTS idx_service_types_status ON service_types(status);
