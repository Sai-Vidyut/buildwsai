-- Invoice Pack payments: orders, payment ledger, webhook events.
-- No customer personal data is stored. Razorpay holds contact, email, and instrument details.

CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  product_id          TEXT NOT NULL CHECK (product_id IN ('invoice-pack', 'advance-receipt')),
  amount_paise        INTEGER NOT NULL CHECK (amount_paise > 0),
  currency            TEXT NOT NULL CHECK (currency = 'INR'),
  mode                TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  razorpay_order_id   TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created', 'authorized', 'paid', 'failed')),
  failure_code        TEXT,
  paid_at             TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at);

-- One row per Razorpay payment attempt. The primary key makes ledger writes idempotent.
CREATE TABLE IF NOT EXISTS payments (
  razorpay_payment_id TEXT PRIMARY KEY,
  order_id            TEXT NOT NULL REFERENCES orders (id),
  amount_paise        INTEGER NOT NULL CHECK (amount_paise > 0),
  currency            TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('authorized', 'captured', 'failed')),
  method              TEXT,
  error_code          TEXT,
  source              TEXT NOT NULL CHECK (source IN ('verify', 'webhook', 'reconcile')),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id            TEXT PRIMARY KEY,
  event_type          TEXT NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  status              TEXT NOT NULL CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  note                TEXT,
  attempts            INTEGER NOT NULL DEFAULT 1,
  received_at         TEXT NOT NULL,
  processed_at        TEXT
);

CREATE INDEX IF NOT EXISTS webhook_events_order_idx ON webhook_events (razorpay_order_id);
