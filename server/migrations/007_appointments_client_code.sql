DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'client_code'
  ) THEN
    ALTER TABLE appointments ADD COLUMN client_code VARCHAR(50);
  END IF;
END $$;
