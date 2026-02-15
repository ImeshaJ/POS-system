DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
      AND column_name = 'due_amount'
  ) THEN
    ALTER TABLE clients ADD COLUMN due_amount NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;
