DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE appointments ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
