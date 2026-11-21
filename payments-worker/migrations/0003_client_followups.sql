-- Payment follow-ups for the freelancer's own client invoices.
-- These are separate from `orders`, which record purchases of Invoice Pack itself:
-- an Invoice Pack payment never marks a client invoice paid.

CREATE TABLE IF NOT EXISTS client_invoices (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL UNIQUE REFERENCES orders (id),
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
  -- Only the freelancer can confirm their client paid; there is no client-payment integration.
  paid_source          TEXT CHECK (paid_source IN ('freelancer_confirmed')),
  paid_at              TEXT,
  consent_at           TEXT NOT NULL,
  contact_purged_at    TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_reminders (
  id                  TEXT PRIMARY KEY,
  invoice_id          TEXT NOT NULL REFERENCES client_invoices (id),
  stage               INTEGER NOT NULL CHECK (stage IN (1, 2, 3)),
  channel             TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  subject             TEXT NOT NULL,
  body                TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'cancelled', 'paused')),
  due_at              TEXT NOT NULL,
  next_attempt_at     TEXT NOT NULL,
  attempts            INTEGER NOT NULL DEFAULT 0,
  claim_id            TEXT,
  claimed_at          TEXT,
  sent_at             TEXT,
  sent_via            TEXT CHECK (sent_via IN ('provider', 'manual')),
  provider_message_id TEXT,
  error_reason        TEXT,
  updated_at          TEXT NOT NULL,
  UNIQUE (invoice_id, stage)
);

CREATE INDEX IF NOT EXISTS client_reminders_due_idx ON client_reminders (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS client_reminders_claim_idx ON client_reminders (claim_id);

-- Append-only history of what happened to each reminder.
CREATE TABLE IF NOT EXISTS client_reminder_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id TEXT NOT NULL REFERENCES client_invoices (id),
  stage      INTEGER CHECK (stage IN (1, 2, 3)),
  event      TEXT NOT NULL,
  detail     TEXT,
  at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS client_reminder_events_invoice_idx ON client_reminder_events (invoice_id, id);
