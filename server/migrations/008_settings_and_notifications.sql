CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(120) UNIQUE NOT NULL,
  category VARCHAR(60) DEFAULT 'general',
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'app_settings_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER app_settings_set_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

INSERT INTO app_settings (key, category, value)
VALUES (
  'shop_info',
  'settings',
  jsonb_build_object(
    'shopName', 'Furry Friends Vet Clinic',
    'address', '123 Pet Avenue, Colombo 7',
    'phone', '+94 (11) 2345678',
    'email', 'info@furryfriends.lk',
    'vatNumber', 'LK998765432'
  )
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Active';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);

CREATE TABLE IF NOT EXISTS system_notifications (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  status VARCHAR(20) NOT NULL DEFAULT 'unread',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_status ON system_notifications(status);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at);
