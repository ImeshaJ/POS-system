CREATE TABLE IF NOT EXISTS clinical_services (
  id SERIAL PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('surgery', 'physiotherapy', 'hospitalization')),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 0,
  base_price NUMERIC(12,2) DEFAULT 0,
  acuity_level TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'active',
  care_notes TEXT,
  resources JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clinical_services_type_idx ON clinical_services(service_type);
CREATE INDEX IF NOT EXISTS clinical_services_status_idx ON clinical_services(status);

CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clinical_services_updated_at ON clinical_services;

CREATE TRIGGER clinical_services_updated_at
BEFORE UPDATE ON clinical_services
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();

INSERT INTO clinical_services (
  service_type,
  name,
  category,
  description,
  duration_minutes,
  base_price,
  acuity_level,
  status,
  care_notes,
  resources,
  checklist
)
SELECT
  'surgery',
  'Orthopedic TPLO Repair',
  'Orthopedic',
  'Stifle stabilization with TPLO plate and post-op laser therapy.',
  180,
  185000,
  'critical',
  'active',
  '48h ICU monitoring with constant-rate analgesia.',
  '["Ortho implant set","C-arm imaging","Arthrex TPLO saw"]'::jsonb,
  '[{"label":"Signed surgical consent","required":true},{"label":"Blood cross-match","required":true},{"label":"IV catheter placed","required":true}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM clinical_services WHERE service_type = 'surgery' AND name = 'Orthopedic TPLO Repair'
);

INSERT INTO clinical_services (
  service_type,
  name,
  category,
  description,
  duration_minutes,
  base_price,
  acuity_level,
  status,
  care_notes,
  resources,
  checklist
)
SELECT
  'surgery',
  'Soft Tissue Mass Removal',
  'Soft Tissue',
  'Wide resection with electrocautery control and sterile closure.',
  120,
  98000,
  'elevated',
  'active',
  'Discharge with collar and re-check in 10 days.',
  '["Ligasure unit","Thermocautery","Comprehensive drape pack"]'::jsonb,
  '[{"label":"Histopath request ready","required":false},{"label":"ASA score documented","required":true}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM clinical_services WHERE service_type = 'surgery' AND name = 'Soft Tissue Mass Removal'
);

INSERT INTO clinical_services (
  service_type,
  name,
  category,
  description,
  duration_minutes,
  base_price,
  acuity_level,
  status,
  care_notes,
  resources,
  checklist
)
SELECT
  'physiotherapy',
  'Neuromuscular Rehab Block',
  'Rehabilitation',
  '8-session block mixing balance, proprioception, and laser therapy.',
  60,
  16500,
  'moderate',
  'active',
  'Progress photos stored every second visit.',
  '["Thera-band set","Wobble board","Class IV laser"]'::jsonb,
  '[{"label":"Pain score logged","required":true},{"label":"Owner homework assigned","required":true}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM clinical_services WHERE service_type = 'physiotherapy' AND name = 'Neuromuscular Rehab Block'
);

INSERT INTO clinical_services (
  service_type,
  name,
  category,
  description,
  duration_minutes,
  base_price,
  acuity_level,
  status,
  care_notes,
  resources,
  checklist
)
SELECT
  'physiotherapy',
  'Hydrotherapy + Laser Combo',
  'Hydrotherapy',
  'Underwater treadmill with adjunct laser to reduce inflammation.',
  45,
  9800,
  'standard',
  'active',
  'Drying bay + thermal wraps post-session.',
  '["Underwater treadmill","Safety harness","Laser goggles"]'::jsonb,
  '[{"label":"Incisions inspected","required":true},{"label":"Water temp logged","required":true}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM clinical_services WHERE service_type = 'physiotherapy' AND name = 'Hydrotherapy + Laser Combo'
);

INSERT INTO clinical_services (
  service_type,
  name,
  category,
  description,
  duration_minutes,
  base_price,
  acuity_level,
  status,
  care_notes,
  resources,
  checklist
)
SELECT
  'hospitalization',
  'Critical Care ICU Stay',
  'Intensive Care',
  'Ventilator capable ICU bay with invasive monitoring.',
  1440,
  22500,
  'critical',
  'active',
  'Hourly doctor rounds, lab panel every 12h.',
  '["Syringe pumps","Ventilator","Multi-parameter monitor"]'::jsonb,
  '[{"label":"Hourly TPR chart","required":true},{"label":"Fluid balance updated","required":true}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM clinical_services WHERE service_type = 'hospitalization' AND name = 'Critical Care ICU Stay'
);

INSERT INTO clinical_services (
  service_type,
  name,
  category,
  description,
  duration_minutes,
  base_price,
  acuity_level,
  status,
  care_notes,
  resources,
  checklist
)
SELECT
  'hospitalization',
  'Post-Op Recovery Suite',
  'Recovery',
  'Step-down ward with active warming and telemetry.',
  720,
  11800,
  'moderate',
  'active',
  'Nursing cares every 2h with analgesia scoring.',
  '["Telemetry pads","Bair hugger","Infusion pumps"]'::jsonb,
  '[{"label":"Pain score recorded","required":true},{"label":"Bandage checked","required":true}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM clinical_services WHERE service_type = 'hospitalization' AND name = 'Post-Op Recovery Suite'
);
