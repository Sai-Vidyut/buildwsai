-- Paid-export entitlements. A paid order unlocks server-rendered exports of one document.
-- Only hashes are stored: the export secret and the document identity (invoice number or receipt client).

ALTER TABLE orders ADD COLUMN access_token_hash TEXT;
ALTER TABLE orders ADD COLUMN document_key TEXT;
ALTER TABLE orders ADD COLUMN export_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN last_export_at TEXT;
