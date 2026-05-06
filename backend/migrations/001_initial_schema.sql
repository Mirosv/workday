-- WorkDay Backend Schema
-- Run: psql $DATABASE_URL -f migrations/001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','employee')),
  plaid_access_token TEXT,
  plaid_item_id      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Business Settings (one per admin) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_email          TEXT NOT NULL,
  business_name        TEXT NOT NULL DEFAULT 'Mi Empresa',
  business_phone       TEXT DEFAULT '',
  business_address     TEXT DEFAULT '',
  logo_url             TEXT DEFAULT '',
  default_labor_rate   NUMERIC DEFAULT 0,
  default_overhead_pct NUMERIC DEFAULT 0,
  default_profit_pct   NUMERIC DEFAULT 0,
  language             TEXT DEFAULT 'en' CHECK (language IN ('en','es')),
  plan                 TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','premium')),
  status               TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  plan_expires_at      DATE,
  stripe_secret_key    TEXT DEFAULT '',
  stripe_webhook_secret TEXT DEFAULT '',
  stripe_price_pro     TEXT DEFAULT '',
  stripe_price_premium TEXT DEFAULT '',
  notes                TEXT DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Employees ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  business_owner_email TEXT NOT NULL,
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name            TEXT NOT NULL,
  email                TEXT,
  phone                TEXT,
  role                 TEXT DEFAULT 'employee' CHECK (role IN ('admin','employee')),
  position             TEXT,
  hourly_rate          NUMERIC DEFAULT 0,
  status               TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  lunch_break_minutes  INTEGER DEFAULT 30,
  lunch_paid           BOOLEAN DEFAULT false,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Jobs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  client_name           TEXT NOT NULL,
  client_phone          TEXT,
  client_email          TEXT,
  job_name              TEXT NOT NULL,
  job_address           TEXT,
  total_price           NUMERIC DEFAULT 0,
  grand_total           NUMERIC DEFAULT 0,
  status                TEXT DEFAULT 'lead' CHECK (status IN ('lead','estimate','in_progress','paid','cancelled')),
  priority              TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  date                  DATE,
  follow_up_date        DATE,
  invoice_number        TEXT,
  notes                 TEXT,
  internal_notes        TEXT,
  services              JSONB DEFAULT '[]',
  labor_rate            NUMERIC DEFAULT 0,
  labor_hours           NUMERIC DEFAULT 0,
  overhead_pct          NUMERIC DEFAULT 0,
  profit_pct            NUMERIC DEFAULT 0,
  discount              NUMERIC DEFAULT 0,
  minimum_fee           NUMERIC DEFAULT 0,
  equipment_wear        NUMERIC DEFAULT 0,
  equipment_wear_on     BOOLEAN DEFAULT false,
  materials_consumables NUMERIC DEFAULT 0,
  materials_on          BOOLEAN DEFAULT false,
  disposal_fees         NUMERIC DEFAULT 0,
  disposal_on           BOOLEAN DEFAULT false,
  travel_mobilization   NUMERIC DEFAULT 0,
  travel_on             BOOLEAN DEFAULT false,
  business_name         TEXT,
  business_phone        TEXT,
  business_address      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Time Entries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  business_owner_email TEXT NOT NULL,
  employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name        TEXT,
  clock_in             TIMESTAMPTZ,
  clock_out            TIMESTAMPTZ,
  clock_in_lat         NUMERIC,
  clock_in_lng         NUMERIC,
  clock_out_lat        NUMERIC,
  clock_out_lng        NUMERIC,
  clock_in_address     TEXT,
  clock_out_address    TEXT,
  duration_minutes     INTEGER DEFAULT 0,
  status               TEXT DEFAULT 'active' CHECK (status IN ('active','completed')),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  amount         NUMERIC DEFAULT 0,
  date           DATE,
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_name       TEXT DEFAULT '',
  category       TEXT DEFAULT 'other' CHECK (category IN ('materials','fuel','tools','labor','disposal','other')),
  tax_category   TEXT DEFAULT 'none',
  payment_method TEXT DEFAULT 'other',
  receipt_ref    TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Bookings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  client_name    TEXT NOT NULL,
  client_phone   TEXT,
  client_email   TEXT,
  service        TEXT,
  notes          TEXT,
  date           DATE NOT NULL,
  time_slot      TEXT NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  internal_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Available Slots ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS available_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  time_slot     TEXT NOT NULL,
  max_bookings  INTEGER DEFAULT 1,
  service_label TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Time Off Requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_off_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  business_owner_email TEXT NOT NULL,
  employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name        TEXT,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  reason               TEXT,
  type                 TEXT DEFAULT 'vacation' CHECK (type IN ('vacation','sick','personal','other')),
  status               TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  admin_notes          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Mileage Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mileage_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  description    TEXT NOT NULL,
  from_location  TEXT,
  to_location    TEXT,
  odometer_start NUMERIC DEFAULT 0,
  odometer_end   NUMERIC DEFAULT 0,
  business_miles NUMERIC DEFAULT 0,
  vehicle        TEXT DEFAULT '',
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_name       TEXT DEFAULT '',
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Owner Transactions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owner_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  transaction_type    TEXT NOT NULL DEFAULT 'owner_contribution',
  amount              NUMERIC DEFAULT 0,
  description         TEXT NOT NULL,
  counterparty_name   TEXT DEFAULT '',
  counterparty_country TEXT DEFAULT 'US',
  payment_method      TEXT DEFAULT 'bank_transfer',
  reference_number    TEXT DEFAULT '',
  account             TEXT DEFAULT '',
  tax_year            INTEGER DEFAULT 2025,
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Reconcile Matches ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reconcile_matches (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES business_settings(id) ON DELETE CASCADE,
  owner_email          TEXT NOT NULL,
  plaid_transaction_id TEXT NOT NULL,
  plaid_date           TEXT,
  plaid_name           TEXT,
  plaid_amount         NUMERIC,
  expense_id           UUID REFERENCES expenses(id) ON DELETE SET NULL,
  expense_name         TEXT DEFAULT '',
  status               TEXT DEFAULT 'unmatched' CHECK (status IN ('matched','unmatched','ignored')),
  notes                TEXT DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Auto-update updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','business_settings','employees','jobs','time_entries',
    'expenses','bookings','available_slots','time_off_requests',
    'mileage_logs','owner_transactions','reconcile_matches'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
       CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;
