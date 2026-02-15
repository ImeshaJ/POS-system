DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='client_name'
  ) THEN
    ALTER TABLE appointments ADD COLUMN client_name VARCHAR(200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='pet_name'
  ) THEN
    ALTER TABLE appointments ADD COLUMN pet_name VARCHAR(200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='pet_type'
  ) THEN
    ALTER TABLE appointments ADD COLUMN pet_type VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='age'
  ) THEN
    ALTER TABLE appointments ADD COLUMN age VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='weight'
  ) THEN
    ALTER TABLE appointments ADD COLUMN weight VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='last_visit'
  ) THEN
    ALTER TABLE appointments ADD COLUMN last_visit VARCHAR(50);
  END IF;
END $$;
