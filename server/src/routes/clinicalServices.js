const { createCrudRouter } = require("./crud")
const pool = require("../db")

const ensureClinicalServicesSchema = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS clinical_services (
      id SERIAL PRIMARY KEY
    )`
  )

  const columnStatements = [
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS service_type TEXT",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS name TEXT",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS category TEXT",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS base_price NUMERIC(12,2) DEFAULT 0",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS acuity_level TEXT DEFAULT 'standard'",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS care_notes TEXT",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE clinical_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
  ]

  for (const statement of columnStatements) {
    await pool.query(statement)
  }

  await pool.query(
    "ALTER TABLE clinical_services DROP CONSTRAINT IF EXISTS clinical_services_service_type_check"
  )
  await pool.query(
    "CREATE INDEX IF NOT EXISTS clinical_services_type_idx ON clinical_services(service_type)"
  )
  await pool.query(
    "CREATE INDEX IF NOT EXISTS clinical_services_status_idx ON clinical_services(status)"
  )
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'clinical_services_updated_at'
      ) THEN
        CREATE TRIGGER clinical_services_updated_at
        BEFORE UPDATE ON clinical_services
        FOR EACH ROW
        EXECUTE PROCEDURE set_timestamp();
      END IF;
    END;
    $$;
  `)
}

ensureClinicalServicesSchema().catch((err) =>
  console.error("Failed to ensure clinical_services schema", err)
)

module.exports = createCrudRouter({
  table: "clinical_services",
  columns: [
    "service_type",
    "name",
    "category",
    "description",
    "duration_minutes",
    "base_price",
    "acuity_level",
    "status",
    "care_notes",
    "resources",
    "checklist",
  ],
  required: ["service_type", "name", "category"],
  orderBy: "updated_at",
  select:
    "id, service_type, name, category, description, duration_minutes, base_price, acuity_level, status, care_notes, resources, checklist, created_at, updated_at",
  jsonColumns: ["resources", "checklist"],
  filters: ["service_type", "status"],
})
