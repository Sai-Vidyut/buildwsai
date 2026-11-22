-- Free Invoice Pack access that never touches Razorpay records.
--   admin_passes   permanent admin entitlement: a revocable per-browser pass; only the token hash is stored
--   promo_codes    one-time codes created by the admin; only the code hash is stored
--   access_grants  one Invoice Pack purchase granted for free (source admin_grant or promo_grant). It is
--                  authorized like a paid order (access-token hash, key mode, document binding, export cap)
--                  but is never written to `orders` or `payments`, so it can never look like a payment.
--   access_events  append-only audit trail of creation, redemption, expiry and revocation.

CREATE TABLE IF NOT EXISTS admin_passes (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  mode         TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at   TEXT
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id             TEXT PRIMARY KEY,
  code_hash      TEXT NOT NULL UNIQUE,
  code_hint      TEXT NOT NULL,
  mode           TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  note           TEXT,
  bound_email    TEXT,
  expires_at     TEXT,
  created_at     TEXT NOT NULL,
  redeemed_at    TEXT,
  redeemed_email TEXT,
  grant_id       TEXT UNIQUE,
  revoked_at     TEXT,
  expired_at     TEXT,
  CHECK (redeemed_at IS NULL OR revoked_at IS NULL),
  CHECK ((redeemed_at IS NULL) = (grant_id IS NULL))
);

CREATE TABLE IF NOT EXISTS access_grants (
  id                TEXT PRIMARY KEY,
  product_id        TEXT NOT NULL CHECK (product_id = 'invoice-pack'),
  source            TEXT NOT NULL CHECK (source IN ('admin_grant', 'promo_grant')),
  mode              TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  access_token_hash TEXT NOT NULL,
  admin_pass_id     TEXT REFERENCES admin_passes (id),
  promo_code_id     TEXT UNIQUE REFERENCES promo_codes (id),
  document_key      TEXT,
  export_count      INTEGER NOT NULL DEFAULT 0,
  last_export_at    TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  CHECK (
    (source = 'admin_grant' AND admin_pass_id IS NOT NULL AND promo_code_id IS NULL) OR
    (source = 'promo_grant' AND promo_code_id IS NOT NULL AND admin_pass_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS access_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('admin_pass', 'promo_code')),
  subject_id   TEXT NOT NULL,
  event        TEXT NOT NULL,
  actor        TEXT NOT NULL CHECK (actor IN ('admin', 'holder', 'system')),
  detail       TEXT,
  at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS access_events_subject_idx ON access_events (subject_type, subject_id, id);
CREATE INDEX IF NOT EXISTS promo_codes_expiry_idx ON promo_codes (expires_at) WHERE redeemed_at IS NULL AND revoked_at IS NULL;

-- A follow-up now belongs to exactly one paid order or one grant. SQLite cannot relax NOT NULL in place,
-- so the table is rebuilt with every row and column copied. Reminders and events keep pointing at the
-- same ids; foreign keys are checked when the migration's transaction commits.
PRAGMA defer_foreign_keys = on;

CREATE TABLE client_invoices_new (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT UNIQUE REFERENCES orders (id),
  grant_id             TEXT UNIQUE REFERENCES access_grants (id),
  manage_token_hash    TEXT NOT NULL,
  mode                 TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  business_name        TEXT NOT NULL,
  client_name          TEXT NOT NULL,
  client_email         TEXT,
  client_phone         TEXT,
  reply_to             TEXT,
  invoice_number       TEXT NOT NULL,
  amount_paise         INTEGER NOT NULL CHECK (amount_paise >= 0),
  currency             TEXT NOT NULL CHECK (currency = 'INR'),
  invoice_date         TEXT NOT NULL,
  due_date             TEXT NOT NULL,
  payment_instructions TEXT,
  invoice_link         TEXT,
  timezone             TEXT NOT NULL DEFAULT 'Asia/Kolkata' CHECK (timezone = 'Asia/Kolkata'),
  second_delay_days    INTEGER NOT NULL CHECK (second_delay_days BETWEEN 1 AND 60),
  third_delay_days     INTEGER NOT NULL CHECK (third_delay_days BETWEEN 2 AND 90 AND third_delay_days > second_delay_days),
  reminders_enabled    INTEGER NOT NULL CHECK (reminders_enabled IN (0, 1)),
  payment_status       TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  paid_source          TEXT CHECK (paid_source IN ('freelancer_confirmed')),
  paid_at              TEXT,
  consent_at           TEXT NOT NULL,
  contact_purged_at    TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  CHECK ((order_id IS NULL) <> (grant_id IS NULL))
);

INSERT INTO client_invoices_new (
  id, order_id, grant_id, manage_token_hash, mode, business_name, client_name, client_email, client_phone, reply_to,
  invoice_number, amount_paise, currency, invoice_date, due_date, payment_instructions, invoice_link, timezone,
  second_delay_days, third_delay_days, reminders_enabled, payment_status, paid_source, paid_at, consent_at,
  contact_purged_at, created_at, updated_at
)
SELECT
  id, order_id, NULL, manage_token_hash, mode, business_name, client_name, client_email, client_phone, reply_to,
  invoice_number, amount_paise, currency, invoice_date, due_date, payment_instructions, invoice_link, timezone,
  second_delay_days, third_delay_days, reminders_enabled, payment_status, paid_source, paid_at, consent_at,
  contact_purged_at, created_at, updated_at
FROM client_invoices;

DROP TABLE client_invoices;
ALTER TABLE client_invoices_new RENAME TO client_invoices;

PRAGMA defer_foreign_keys = off;
