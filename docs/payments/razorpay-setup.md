# Razorpay payments: architecture and setup

Invoice Pack (₹499) and Advance Receipt (₹399) can be paid in two ways:

- **Pay using Razorpay** — Razorpay Checkout (UPI, card, netbanking, wallet). A backend creates the order, verifies the payment, and records it. The page says "paid" only after the backend confirms it.
- **Pay using UPI** — the existing direct UPI QR and link to `saividyut2@okicici`. Unchanged. The customer saves their UTR in the browser as `payment_pending`, and the payment is checked by hand.

Nothing here is deployed automatically. Until you set the `PAYMENTS_API_URL` repository variable, the live site shows only the direct UPI option, exactly as before.

## Architecture

```
Browser (buildwsai.online, GitHub Pages)
  │  1. POST /api/payments/create-order { productId }
  │  4. POST /api/payments/verify { orderRef, razorpay_order_id, razorpay_payment_id, razorpay_signature }
  │  5. GET  /api/payments/orders/:orderRef
  │  6. POST /api/payments/exports/invoice|receipt { orderRef, accessToken, input }
  ▼
Cloudflare Worker "invoice-pack-payments" (payments-worker/)
  │  prices from a server-side catalogue, HMAC checks, conditional writes
  ├──► D1 database "invoice-pack-payments": orders, payments, webhook_events
  └──► Razorpay API: POST /v1/orders, GET /v1/payments/:id (Basic auth with key id + secret)

Razorpay Checkout (checkout.razorpay.com) ── 2–3. customer pays inside Razorpay's window
Razorpay webhooks ── POST /api/payments/webhook (payment.captured, payment.failed, order.paid)
```

Flow:

1. The browser sends only a product id. The Worker looks up the price (49900 or 39900 paise), creates a Razorpay order, stores it in D1 with status `created`, and returns the Razorpay order id, amount, currency, and the public key id.
2. The browser opens Razorpay Checkout with that order. Closing the window marks nothing; the page shows "not paid" and offers a retry on the same order.
3. On success, Razorpay hands the browser `razorpay_payment_id` and `razorpay_signature`.
4. The browser posts those to `/verify`. The Worker recomputes `HMAC_SHA256(stored_order_id + "|" + payment_id, key_secret)`, compares it in constant time, then fetches the payment from Razorpay and checks order id, amount, and currency. Only a `captured` payment marks the order `paid`. An `authorized` payment is shown as "processing".
5. Razorpay also sends webhooks. They are authenticated against the raw body with the webhook secret, deduplicated by `X-Razorpay-Event-Id`, and applied with the same rules. If the customer closes the tab before step 4, the webhook still marks the order paid.

6. The final invoice or receipt is built by the Worker, not the browser. See [Protected exports](#protected-exports).

Every state change is a conditional SQL update, so verify, webhooks, retries, and out-of-order deliveries converge on the same result. `paid` is terminal: a late `payment.failed` cannot undo it.

### Order status

| Stored status | Shown to customer | Meaning |
| --- | --- | --- |
| `created` | pending | Order created, no successful payment yet (includes cancelled checkouts) |
| `authorized` | processing | Bank approved; waiting for capture (auto-capture usually takes seconds) |
| `paid` | paid | Captured payment verified against amount, currency, and order |
| `failed` | failed | Last attempt failed; the customer can retry on the same order |

## Endpoints

All responses are JSON with `Cache-Control: no-store`. Errors are `{ "error": { "code", "message" } }` with no internal detail.

| Method and path | Body | Notes |
| --- | --- | --- |
| `POST /api/payments/create-order` | `{ "productId": "invoice-pack" \| "advance-receipt" }` | Any other field, including `amount`, is rejected with 400. Rate limit 10/min per IP. Returns 201 `{ orderRef, accessToken, razorpayOrderId, amount, currency, keyId, productId, productName }`. `accessToken` is returned once; only its SHA-256 is stored. |
| `POST /api/payments/verify` | `{ orderRef, razorpay_order_id, razorpay_payment_id, razorpay_signature }` | Rate limit 30/min per IP. Returns the order view; repeat calls return `alreadyVerified: true`. 400 for bad signature, wrong order, or wrong amount. 409 if the order was already paid by a different payment. |
| `GET /api/payments/orders/:orderRef` | — | Returns `{ orderRef, productId, productName, amount, currency, status, razorpayPaymentId, paidAt }`. Reconciles an `authorized` order with Razorpay. Order refs carry 100 random bits, so they cannot be guessed. |
| `POST /api/payments/webhook` | Razorpay event (raw) | Requires a valid `X-Razorpay-Signature`. No CORS. Always 2xx once processed or deduplicated; 5xx on processing errors so Razorpay retries. |
| `POST /api/payments/exports/invoice` and `/exports/receipt` | `{ orderRef, accessToken, input }` | Rate limit 30/min per IP, body ≤ 16 KB. Returns `{ html, filename, exportsUsed, exportsLimit }`. 403 `not_entitled` (unknown order, wrong token, or order from the other key mode), 403 `wrong_product`, 402 `payment_required`, 422 `document_incomplete`, 409 `document_mismatch`, 429 `export_limit`. |
| `GET /api/payments/health` | — | `{ ok, configured }`. Shows whether secrets are set, never their values. |

CORS allows only the origins in `ALLOWED_ORIGINS` (default `https://buildwsai.online,https://www.buildwsai.online`). Requests from any other browser origin get 403. No cookies or credentials are used.

## Protected exports

When `PAYMENTS_API_URL` is set, the page shows a watermarked draft preview ("Draft preview · not for sending") and has no print button. The final document comes only from the Worker:

1. `create-order` returns a 256-bit `accessToken` alongside the order reference. The browser keeps both in `localStorage`; D1 keeps only the token's SHA-256. The order reference alone, which appears on screen and in Razorpay, unlocks nothing.
2. To export, the browser posts the order reference, the token, and the form fields. The Worker checks the token in constant time, checks that the order is `paid`, is for this product, and was paid with the same key mode as the current `RAZORPAY_KEY_ID` (test payments never unlock exports once live keys are set).
3. The Worker keeps only known fields, enforces length limits, recomputes every total with the same `src/invoice-pack/logic.ts` the page uses, and returns escaped HTML. Totals sent by the browser are ignored. The form fields are not stored.
4. The first successful export binds the order to one document: the invoice number for Invoice Pack, the client name for Advance Receipt (both case- and space-insensitive, stored as a SHA-256 `document_key`). Re-exports with corrections are allowed up to 20 per order; a different invoice number or client needs a new purchase. Validation failures do not use up an export.
5. The page prints the HTML from a sandboxed iframe (scripts disabled) and offers it as a download.

Editing browser storage, the URL, or the page cannot unlock an export: without a paid order and its token the Worker refuses with 402 or 403. Without `PAYMENTS_API_URL` the page behaves as before (free print, no watermark).

## Database schema (D1)

Defined in `payments-worker/migrations/0001_init.sql` and `0002_entitlements.sql`.

- **`orders`** — `id` (internal reference such as `IP-7KQ…`, primary key), `product_id`, `amount_paise`, `currency`, `mode` (test/live), `razorpay_order_id` (unique), `razorpay_payment_id` (unique), `status`, `failure_code`, `paid_at`, `created_at`, `updated_at`. Index on `(status, created_at)`. From migration 0002: `access_token_hash`, `document_key`, `export_count`, `last_export_at`.
- **`payments`** — ledger, one row per Razorpay payment attempt. `razorpay_payment_id` is the primary key, so a payment can never be recorded twice. Columns: `order_id`, `amount_paise`, `currency`, `status` (authorized/captured/failed), `method`, `error_code`, `source` (verify/webhook/reconcile), timestamps. A captured row is never downgraded.
- **`webhook_events`** — `event_id` (primary key), `event_type`, `razorpay_order_id`, `razorpay_payment_id`, `status` (received/processed/ignored/failed), `note`, `attempts`, `received_at`, `processed_at`.

Personal data: none. No name, email, phone, address, card, or UPI id is stored. Razorpay keeps the customer's contact details on its side.

## Costs and free-tier limits

| Service | Plan | Limits that matter | Expected cost |
| --- | --- | --- | --- |
| GitHub Pages | Free | Unchanged | ₹0 |
| Cloudflare Workers | Free | 100,000 requests/day, 10 ms CPU per request, 50 subrequests per request | ₹0. One purchase uses about 4–8 requests. |
| Cloudflare D1 | Free | 5 million rows read/day, 100,000 rows written/day, 5 GB storage. Resets 00:00 UTC. | ₹0. One purchase writes about 6–10 rows. |
| Workers rate limiting | Included | Counters are per Cloudflare location and approximate | ₹0 |
| Razorpay | Standard | Per-transaction fee on each successful payment (check your plan in the Razorpay Dashboard; typically about 2% plus GST on the fee) | The only unavoidable cost. No setup or annual fee on the standard plan. |

If the free limits are exceeded, Workers returns errors until the daily reset; it does not bill you unless you upgrade to Workers Paid (USD 5/month). No paid database or email service is used.

## Setup (test mode first)

Run commands from the repository root unless a step says otherwise. You need Node 22 and a Cloudflare account (free).

### 1. Razorpay account

Sign up at https://dashboard.razorpay.com/signup. Test mode works before KYC. Live mode needs account activation (KYC and website review). Add `https://buildwsai.online` as your website when asked.

### 2. Test API keys

1. In the Razorpay Dashboard, switch the mode toggle to **Test Mode**.
2. Go to **Account & Settings → API Keys → Generate Key**.
3. Copy the **Key Id** (`rzp_test_…`) and **Key Secret** into a password manager. The secret is shown once. Do not paste either into any file in this repository.
4. Go to **Account & Settings → Payment Capture** and make sure payments are captured automatically. The backend only marks orders paid once a payment is captured.

### 3. Cloudflare Worker project

```bash
cd payments-worker
npm ci
npx wrangler login
```

`wrangler login` opens a browser to authorize your Cloudflare account.

### 4. D1 database

```bash
npx wrangler d1 create invoice-pack-payments
```

Copy the printed `database_id` into `payments-worker/wrangler.toml`, replacing `00000000-0000-0000-0000-000000000000`. The id is not a secret. Then create the tables:

```bash
npm run db:migrate:remote
```

This applies every migration in `migrations/` that has not run yet (0001 and 0002). Run it again after pulling a branch that adds a migration, before deploying the Worker.

### 5. Secrets

Each command prompts for the value; paste it there, not on the command line.

```bash
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
openssl rand -hex 32          # generate a webhook secret, keep it for step 7
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
```

Secrets are encrypted by Cloudflare and are never part of the code, the frontend bundle, or git.

For local development, copy `.dev.vars.example` to `.dev.vars` (git-ignored), fill in test values, then run `npm run db:migrate:local` and `npm run dev`.

### 6. Deploy the Worker

```bash
npm run deploy
curl https://invoice-pack-payments.<your-subdomain>.workers.dev/api/payments/health
```

Expect `{"ok":true,"configured":true}`. `deploy` prints the exact URL.

Then point the site at it:

1. GitHub → repository **Settings → Secrets and variables → Actions → Variables → New repository variable**.
2. Name `PAYMENTS_API_URL`, value `https://invoice-pack-payments.<your-subdomain>.workers.dev` (no trailing slash).
3. The next Pages deploy (a push to `main` or **Actions → Deploy to GitHub Pages → Run workflow**) shows the Razorpay option.

### 7. Webhook

1. Razorpay Dashboard (Test Mode) → **Account & Settings → Webhooks → Add New Webhook**.
2. Webhook URL: `https://invoice-pack-payments.<your-subdomain>.workers.dev/api/payments/webhook`
3. Secret: the value from step 5.
4. Active events: `payment.captured`, `payment.failed`, `order.paid`.
5. Save. Razorpay may ask for an OTP; in test mode the docs give `754081`.

### 8. Test payment

1. Open https://buildwsai.online/invoice-pack, go to Pricing, choose **Pay using Razorpay**, and click **Pay ₹499 with Razorpay**.
2. Pay with UPI id `success@razorpay` (or test card `4100 2800 0000 1007`, any future expiry, any CVV). The page should show **Payment confirmed** with an order reference and a `pay_…` id.
3. Repeat with `failure@razorpay` to see the failure message, and close the window once to see the cancelled message.
4. Build an invoice in **Create invoice**. Before paying, the export panel says it is locked. After the successful payment it unlocks; click **Export final invoice** and check the printed copy has no watermark. Changing the invoice number and exporting again should be refused. Repeat for the Advance Receipt.
5. Check the records:

```bash
cd payments-worker
npx wrangler d1 execute invoice-pack-payments --remote --command "SELECT id, product_id, amount_paise, status, paid_at FROM orders ORDER BY created_at DESC LIMIT 10"
npx wrangler d1 execute invoice-pack-payments --remote --command "SELECT event_type, status, note, attempts FROM webhook_events ORDER BY received_at DESC LIMIT 10"
npx wrangler d1 execute invoice-pack-payments --remote --command "SELECT id, status, export_count, last_export_at FROM orders WHERE export_count > 0 ORDER BY updated_at DESC LIMIT 10"
```

6. In the Razorpay Dashboard → Webhooks, the deliveries should show 200 responses.

### 9. Switch from test to live

Only after test payments work end to end:

1. Complete Razorpay account activation.
2. Switch the Dashboard to **Live Mode** → **Account & Settings → API Keys → Generate Key**.
3. Replace the Worker secrets with live values (same commands as step 5; generate a new webhook secret):

```bash
cd payments-worker
npx wrangler secret put RAZORPAY_KEY_ID        # rzp_live_…
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
```

4. Webhooks are per mode: add the same webhook again in **Live Mode** with the new secret and the same three events.
5. Check Payment Capture is automatic in Live Mode too.

Orders record whether they were created with test or live keys (`mode` column), so test rows stay distinguishable, and test-mode orders stop unlocking exports as soon as live keys are set. Secret changes take effect immediately; no redeploy is needed.

### 10. Production credentials hygiene

- Keep live keys only in Cloudflare secrets and your password manager. Never in `.dev.vars` on a shared machine, chat, email, or screenshots.
- Use test keys for any local development.
- If a secret is exposed, regenerate it in the Razorpay Dashboard immediately, then run `wrangler secret put` with the new value.
- Restrict who can access the Cloudflare account and the Razorpay Dashboard, and turn on two-factor authentication for both.
- Check the Webhooks page in the Razorpay Dashboard occasionally for failed deliveries.

## Tests

```bash
cd payments-worker
npm ci
npm run typecheck
npm test
```

The tests run the real Worker handler against an in-memory SQLite database loaded from the real migration (standing in for D1) and a fake Razorpay API that signs payments the same way Razorpay does. They cover order creation for both products, rejection of client-supplied amounts, valid and invalid signatures, wrong order, wrong amount, duplicate verification, invalid and duplicate webhooks, failed and cancelled payments, out-of-order events, CORS, rate limiting, that no response contains a secret, and protected exports (unpaid, wrong token, wrong product, test-to-live switch, document binding, export cap, recomputed totals, HTML escaping). They run in CI through `.github/workflows/payments-worker.yml`.

`test/e2e-mock-server.ts` serves the same handler over HTTP for local browser testing. It is never deployed.

## Known limitations

- **The draft preview is free.** Customers can see a watermarked preview and copy the reminder messages without paying; only the final export is locked. A determined user could still screenshot or retype the preview, as with any on-screen document.
- **The export token lives in one browser.** Clearing site data or switching devices loses it. The page has no account system, so recovery is manual: look up the order by reference or Razorpay payment id and help by email (support is shown on the page).
- **Direct UPI payments do not unlock exports.** They are confirmed manually, so a UPI customer needs the exported file sent by hand.
- **No email or delivery automation.** The confirmation shows the order reference and Razorpay payment id on screen. No email is sent.
- **Refunds** are not handled by the backend. Refund from the Razorpay Dashboard; the order stays `paid` in D1.
- **A second capture on a paid order** (very rare; Razorpay blocks new payments once an order is paid) is recorded in the `payments` ledger and logged as `second_capture`, and the order keeps its first payment. Refund the extra payment from the Dashboard.
- **Rate limits** are approximate and per Cloudflare location. They stop casual abuse, not a determined distributed attack. Razorpay order creation is free, so the impact of abuse is limited to D1 row writes.
- **Direct UPI payments** remain manual: saving a UTR does not mark anything paid.
