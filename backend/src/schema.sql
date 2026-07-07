-- ==========================================================
-- Litmus Operations Management System (LOMS) - Database Schema
-- PostgreSQL 18 (Render)
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------
-- USERS / AUTH / ROLES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(30) NOT NULL DEFAULT 'attendant'
                CHECK (role IN ('owner','admin','cashier','cyber_attendant','technician','accountant')),
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(150),
  email         VARCHAR(150),
  business_name VARCHAR(150),
  location      VARCHAR(150),
  tags          TEXT[] DEFAULT '{}',
  notes         TEXT,
  loyalty_points INTEGER DEFAULT 0,
  is_vip        BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- SERVICE CATALOG (Cyber Services quick buttons)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_catalog (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50) DEFAULT 'general',
  default_price NUMERIC(12,2) DEFAULT 0,
  icon        VARCHAR(50),
  is_active   BOOLEAN DEFAULT TRUE
);

-- ---------------------------------------------------------
-- PRODUCTS / INVENTORY (Laptop Store & Accessories)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku           VARCHAR(50) UNIQUE,
  barcode       VARCHAR(50),
  name          VARCHAR(150) NOT NULL,
  category      VARCHAR(80) NOT NULL,
  brand         VARCHAR(80),
  buying_price  NUMERIC(12,2) DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier      VARCHAR(150),
  quantity      INTEGER DEFAULT 0,
  min_stock     INTEGER DEFAULT 3,
  warranty      VARCHAR(80),
  image_url     TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  change_qty  INTEGER NOT NULL,
  reason      VARCHAR(100),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- SUPPLIERS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  phone         VARCHAR(20),
  email         VARCHAR(150),
  outstanding_balance NUMERIC(12,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- TRANSACTIONS - unified ledger for Cyber Services + Laptop
-- Store sales + Debt tracking. `module` distinguishes source.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  module        VARCHAR(20) NOT NULL CHECK (module IN ('cyber_service','product_sale')),
  service_id    INTEGER REFERENCES service_catalog(id),
  product_id    UUID REFERENCES products(id),
  description   VARCHAR(200) NOT NULL,
  quantity      NUMERIC(10,2) DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid   NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance       NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status        VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','partial')),
  served_by     UUID REFERENCES users(id),
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Payments applied against a transaction/debt (supports partial payments)
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL,
  method         VARCHAR(30) DEFAULT 'cash' CHECK (method IN ('cash','mpesa','card','bank')),
  received_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- TASKS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(200) NOT NULL,
  client_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  description  TEXT,
  deadline     TIMESTAMPTZ,
  priority     VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status       VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo','in_progress','waiting','completed','cancelled')),
  assigned_to  UUID REFERENCES users(id),
  reminder_before VARCHAR(20) DEFAULT '1_day',
  notify_email BOOLEAN DEFAULT TRUE,
  notify_sms   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- REPAIR MANAGEMENT (bonus feature)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS repairs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  device          VARCHAR(150),
  issue           TEXT,
  technician_notes TEXT,
  status          VARCHAR(30) DEFAULT 'received' CHECK (status IN ('received','diagnosing','in_repair','waiting_parts','ready','delivered')),
  expected_completion DATE,
  technician_id   UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- INVOICES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  issue_date     DATE DEFAULT CURRENT_DATE,
  due_date       DATE,
  items          JSONB NOT NULL DEFAULT '[]',
  subtotal       NUMERIC(12,2) DEFAULT 0,
  vat            NUMERIC(12,2) DEFAULT 0,
  discount       NUMERIC(12,2) DEFAULT 0,
  total          NUMERIC(12,2) DEFAULT 0,
  status         VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','overdue','draft')),
  terms          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- BULK SMS / EMAIL CAMPAIGNS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message       TEXT NOT NULL,
  audience      VARCHAR(30) DEFAULT 'everyone' CHECK (audience IN ('customers','debtors','vip','everyone')),
  scheduled_for TIMESTAMPTZ,
  status        VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','failed','sending')),
  recipients_count INTEGER DEFAULT 0,
  cost          NUMERIC(12,2) DEFAULT 0,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES sms_campaigns(id) ON DELETE SET NULL,
  recipient     VARCHAR(20) NOT NULL,
  message       TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  cost          NUMERIC(10,2) DEFAULT 0,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- EXPENSES / CASHBOOK
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description VARCHAR(200) NOT NULL,
  category    VARCHAR(80),
  amount      NUMERIC(12,2) NOT NULL,
  recorded_by UUID REFERENCES users(id),
  spent_at    DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashbook_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date  DATE DEFAULT CURRENT_DATE,
  opening_float NUMERIC(12,2) DEFAULT 0,
  cash_in     NUMERIC(12,2) DEFAULT 0,
  cash_out    NUMERIC(12,2) DEFAULT 0,
  expected_closing NUMERIC(12,2) DEFAULT 0,
  actual_closing   NUMERIC(12,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40),
  title       VARCHAR(200),
  message     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- SETTINGS (single row business profile)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  business_name  VARCHAR(150) DEFAULT 'Litmus Solutions',
  logo_url       TEXT,
  theme_primary  VARCHAR(10) DEFAULT '#C1121F',
  currency       VARCHAR(10) DEFAULT 'KES',
  tax_rate       NUMERIC(5,2) DEFAULT 16.00,
  sender_id      VARCHAR(20) DEFAULT 'LITMUS',
  invoice_prefix VARCHAR(10) DEFAULT 'INV-2026-',
  CHECK (id = 1)
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------
-- Default service catalog (from spec)
-- ---------------------------------------------------------
INSERT INTO service_catalog (name, category, default_price) VALUES
 ('Printing','document',10),
 ('Photocopying','document',5),
 ('Scanning','document',20),
 ('Typing','document',20),
 ('Passport Photos','photo',100),
 ('Binding','document',50),
 ('Lamination','document',50),
 ('KRA','gov',200),
 ('NTSA','gov',200),
 ('HELB','gov',200),
 ('SHA','gov',200),
 ('NSSF','gov',200),
 ('eCitizen','gov',200),
 ('Good Conduct','gov',1050),
 ('CV Writing','design',500),
 ('Graphic Design','design',1000),
 ('Email Services','internet',50),
 ('Internet Browsing','internet',50),
 ('Document Editing','document',100),
 ('Software Installation','technical',300),
 ('Windows Installation','technical',500),
 ('Others','general',0)
ON CONFLICT DO NOTHING;
