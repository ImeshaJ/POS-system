-- Core schema for Furry Friends (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  address TEXT,
  due_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20),
  breed VARCHAR(120),
  gender VARCHAR(20),
  age VARCHAR(50),
  weight VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  doctor VARCHAR(120),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_schedules (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  staff_name VARCHAR(120) NOT NULL,
  staff_id VARCHAR(30),
  role VARCHAR(80),
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) DEFAULT 'Scheduled',
  contact VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  address TEXT,
  category VARCHAR(100),
  contact_person VARCHAR(120),
  bank_details TEXT,
  tax_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_dues (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  last_payment_date DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(120),
  unit VARCHAR(50),
  size VARCHAR(50),
  weight VARCHAR(50),
  cost_price NUMERIC(12,2) DEFAULT 0,
  selling_price NUMERIC(12,2) DEFAULT 0,
  expiry_date DATE,
  reorder_level INTEGER DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'In Stock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_no VARCHAR(50),
  date DATE,
  total NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  qty INTEGER DEFAULT 0,
  cost_price NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  invoice_no VARCHAR(50),
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  customer VARCHAR(200),
  pet_name VARCHAR(120),
  date DATE,
  time VARCHAR(20),
  subtotal NUMERIC(12,2) DEFAULT 0,
  vat NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  payment_type VARCHAR(20) DEFAULT 'Cash',
  status VARCHAR(20) DEFAULT 'Completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  price NUMERIC(12,2) DEFAULT 0,
  qty INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  type VARCHAR(120),
  amount NUMERIC(12,2) DEFAULT 0,
  note TEXT,
  date DATE,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  role VARCHAR(100),
  department VARCHAR(100),
  salary NUMERIC(12,2) DEFAULT 0,
  join_date DATE,
  status VARCHAR(20) DEFAULT 'Active',
  address TEXT,
  bank_account VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_records (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  month VARCHAR(10),
  base_salary NUMERIC(12,2) DEFAULT 0,
  allowances NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Pending',
  payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_revenue (
  id SERIAL PRIMARY KEY,
  product VARCHAR(200),
  category VARCHAR(100),
  qty INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2) DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  cost_price NUMERIC(12,2) DEFAULT 0,
  profit NUMERIC(12,2) DEFAULT 0,
  date DATE
);

CREATE TABLE IF NOT EXISTS service_revenue (
  id SERIAL PRIMARY KEY,
  service VARCHAR(200),
  category VARCHAR(100),
  count INTEGER DEFAULT 0,
  price_per_unit NUMERIC(12,2) DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  cost_per_unit NUMERIC(12,2) DEFAULT 0,
  profit NUMERIC(12,2) DEFAULT 0,
  date DATE
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(120),
  price NUMERIC(12,2) DEFAULT 0,
  cost_price NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'clients_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'pets_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER pets_set_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'appointments_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'staff_schedules_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER staff_schedules_set_updated_at BEFORE UPDATE ON staff_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'suppliers_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER suppliers_set_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'supplier_dues_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER supplier_dues_set_updated_at BEFORE UPDATE ON supplier_dues FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'products_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'purchases_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER purchases_set_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'sales_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER sales_set_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'expenses_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'employees_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'salary_records_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER salary_records_set_updated_at BEFORE UPDATE ON salary_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  PERFORM 1 FROM pg_trigger WHERE tgname = 'services_set_updated_at';
  IF NOT FOUND THEN
    CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
