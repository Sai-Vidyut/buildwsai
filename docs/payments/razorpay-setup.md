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
  │  7. POST /api/payments/followups, /followups/manage
  ▼
Cloudflare Worker "invoice-pack-payments" (payments-worker/)
  │  prices from a server-side catalogue, HMAC checks, conditional writes
  ├──► D1 database "invoice-pack-payments": orders, payments, webhook_events,
  │                                         client_invoices, client_reminders, client_reminder_events
  ├──► Razorpay API: POST /v1/orders, GET /v1/payments/:id (Basic auth with key id + secret)
  └──► Email provider (optional, Resend): POST /emails, from the Cron Trigger only

Cron Trigger (every 15 minutes) ── sends due client reminders

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

All responses are JSON with `Cache-Control: no-store`. Errors are `{ "error": { "code", "message" } }` with no internal detail; validation errors add a `details` list of messages.

| Method and path | Body | Notes |
| --- | --- | --- |
| `POST /api/payments/create-order` | `{ "productId": "invoice-pack" \| "advance-receipt" }` | Any other field, including `amount`, is rejected with 400. Rate limit 10/min per IP. Returns 201 `{ orderRef, accessToken, razorpayOrderId, amount, currency, keyId, productId, productName }`. `accessToken` is returned once; only its SHA-256 is stored. |
| `POST /api/payments/verify` | `{ orderRef, razorpay_order_id, razorpay_payment_id, razorpay_signature }` | Rate limit 30/min per IP. Returns the order view; repeat calls return `alreadyVerified: true`. 400 for bad signature, wrong order, or wrong amount. 409 if the order was already paid by a different payment. |
| `GET /api/payments/orders/:orderRef` | — | Returns `{ orderRef, productId, productName, amount, currency, status, razorpayPaymentId, paidAt }`. Reconciles an `authorized` order with Razorpay. Order refs carry 100 random bits, so they cannot be guessed. |
| `POST /api/payments/webhook` | Razorpay event (raw) | Requires a valid `X-Razorpay-Signature`. No CORS. Always 2xx once processed or deduplicated; 5xx on processing errors so Razorpay retries. |
| `POST /api/payments/exports/invoice` and `/exports/receipt` | `{ orderRef, accessToken, input }` | Rate limit 30/min per IP, body ≤ 16 KB. Returns `{ html, filename, exportsUsed, exportsLimit }`. 403 `not_entitled` (unknown order, wrong token, or order from the other key mode), 403 `wrong_product`, 402 `payment_required`, 422 `document_incomplete`, 409 `document_mismatch`, 429 `export_limit`. |
| `POST /api/payments/followups` | `{ orderRef, accessToken, input, contact, schedule, templates?, invoiceLink?, consent: true }` | Rate limit 30/min per IP, body ≤ 32 KB. Needs a paid Invoice Pack order and its token; binds or must match the order's invoice number. Returns 201 `{ followup, manageToken }`; `manageToken` is returned once and only its SHA-256 is stored. 400 `consent_required`, 402, 403, 409 `document_mismatch` or `followup_exists`, 422 `invalid_followup` with `details`. |
| `POST /api/payments/followups/manage` | `{ id, token, action, … }` | Rate limit 30/min per IP. `action` is `view`, `pause`, `resume`, `reschedule`, `update_template`, `update_contact`, `mark_paid`, `mark_sent`, or `retry`. Needs the follow-up's own `manageToken`; the purchase token does not work. 403 `not_authorized` for a wrong token, unknown id, or a follow-up from the other key mode. 409 `invoice_paid` or `reminder_locked`. |
| `GET /api/payments/health` | — | `{ ok, configured, emailDelivery }`. Shows whether secrets are set, never their values. |

CORS allows only the origins in `ALLOWED_ORIGINS` (default `https://buildwsai.online,https://www.buildwsai.online`). Requests from any other browser origin get 403. No cookies or credentials are used.

## Protected exports

When `PAYMENTS_API_URL` is set, the invoice preview is locked: line amounts, taxes, the balance, GSTINs, UPI and bank details are replaced with blurred placeholders and are not in the page's DOM, the reminder messages are hidden, and there is no print button. The summary card above the preview still shows the total so customers can check their numbers. The Advance Receipt keeps its watermarked draft preview. The final document comes only from the Worker:

1. `create-order` returns a 256-bit `accessToken` alongside the order reference. The browser keeps both in `localStorage`; D1 keeps only the token's SHA-256. The order reference alone, which appears on screen and in Razorpay, unlocks nothing.
2. To export, the browser posts the order reference, the token, and the form fields. The Worker checks the token in constant time, checks that the order is `paid`, is for this product, and was paid with the same key mode as the current `RAZORPAY_KEY_ID` (test payments never unlock exports once live keys are set).
3. The Worker keeps only known fields, enforces length limits, recomputes every total with the same `src/invoice-pack/logic.ts` the page uses, and returns escaped HTML. Totals sent by the browser are ignored. The form fields are not stored.
4. The first successful export binds the order to one document: the invoice number for Invoice Pack, the client name for Advance Receipt (both case- and space-insensitive, stored as a SHA-256 `document_key`). Re-exports with corrections are allowed up to 20 per order; a different invoice number or client needs a new purchase. Validation failures do not use up an export.
5. The page shows the returned HTML in a fully sandboxed inline frame, prints it from a sandboxed iframe (scripts disabled), and offers it as a download. Print and download use only that server HTML.

Editing browser storage, the URL, or the page cannot unlock an export: without a paid order and its token the Worker refuses with 402 or 403, and a refused response contains no document content. Without `PAYMENTS_API_URL` the page behaves as before (free print, no watermark).

The browser still computes totals from the customer's own input for the summary card; the protection is that the finished, sendable document is produced only by the Worker for a paid order.

## Payment follow-ups

After paying for Invoice Pack, the freelancer can schedule three reminders to their client about the invoice.

**Two payment systems, kept apart.** Razorpay orders are purchases of Invoice Pack itself. They never mark the freelancer's client invoice paid. A client invoice is marked paid only when the freelancer clicks **Mark invoice paid**, which is recorded as `paid_source = 'freelancer_confirmed'`. Invoice Pack cannot see the freelancer's bank or UPI account.

**Access.** Creating follow-ups needs a paid Invoice Pack order, its `accessToken`, and `consent: true`. The invoice is rebuilt on the server from the form fields, and the order's invoice-number binding is set or checked exactly as for exports. The Worker returns a separate 256-bit `manageToken`; D1 keeps only its hash. Every management action requires it, so the purchase token or an order reference cannot change someone's reminders. One follow-up per order.

**Schedule.** Reminder 1 on the invoice date, reminder 2 after 7 days and reminder 3 after 14 by default, all at 10:00 Asia/Kolkata. Reminder 2 can be 1–60 days and reminder 3 2–90 days, and must come after reminder 2. Times are stored in UTC. If several reminders are already overdue when follow-ups are set up, resumed or rescheduled, only the latest is kept so the client never gets a burst.

**Templates.** Each reminder has an editable subject and message with `{business_name}`, `{client_name}`, `{invoice_number}`, `{amount}`, `{due_date}`, `{payment_instructions}` and `{invoice_link}`. A line whose placeholder is empty is left out. Subjects must be a single line, which prevents header injection.

**Delivery.**

- With `RESEND_API_KEY` and `EMAIL_FROM` set, the Cron Trigger emails due reminders through Resend, from `"<freelancer> via Invoice Pack" <EMAIL_FROM>`, with the freelancer's reply-to address.
- Without them, nothing is sent. The page labels each reminder **Draft · not sent** and offers **Copy message**, **Open email draft** (a `mailto:` link) and **I sent this myself**. A reminder is only ever shown as sent after the provider accepted it or the freelancer recorded it.
- WhatsApp is not implemented. The client phone number is stored for the freelancer's records only.

**Scheduler safety.** Each run claims due reminders with one conditional `UPDATE … SET status = 'sending', claim_id = ?`; every later write checks that claim id, so overlapping or repeated runs cannot send twice. The invoice is re-read just before sending, so a reminder claimed moments before the invoice is marked paid is cancelled instead. The provider receives the reminder id as an idempotency key. Temporary errors (network, 429, 5xx) are retried after 15, 30 and 60 minutes, up to 4 attempts, then marked `failed`; permanent errors fail at once. A send interrupted mid-flight (stuck in `sending` for 10 minutes) is marked `failed` and is not retried automatically, because the email may already have gone out; the freelancer can check and retry. Reminders created with test keys are not sent once live keys are set.

**States.** `scheduled`, `sending`, `sent`, `failed`, `cancelled`, `paused`. Each change is recorded in `client_reminder_events`, which the panel shows as history.

**Contact data.** The client's email, phone, reply-to address and payment instructions are removed 90 days after the last update once no reminder is pending.

## Database schema (D1)

Defined in `payments-worker/migrations/0001_init.sql`, `0002_entitlements.sql` and `0003_client_followups.sql`.

- **`orders`** — `id` (internal reference such as `IP-7KQ…`, primary key), `product_id`, `amount_paise`, `currency`, `mode` (test/live), `razorpay_order_id` (unique), `razorpay_payment_id` (unique), `status`, `failure_code`, `paid_at`, `created_at`, `updated_at`. Index on `(status, created_at)`. From migration 0002: `access_token_hash`, `document_key`, `export_count`, `last_export_at`.
- **`payments`** — ledger, one row per Razorpay payment attempt. `razorpay_payment_id` is the primary key, so a payment can never be recorded twice. Columns: `order_id`, `amount_paise`, `currency`, `status` (authorized/captured/failed), `method`, `error_code`, `source` (verify/webhook/reconcile), timestamps. A captured row is never downgraded.
- **`webhook_events`** — `event_id` (primary key), `event_type`, `razorpay_order_id`, `razorpay_payment_id`, `status` (received/processed/ignored/failed), `note`, `attempts`, `received_at`, `processed_at`.

- **`client_invoices`** (0003) — one per follow-up: `order_id` (unique, references `orders`), `manage_token_hash`, `mode`, invoice snapshot (business and client name, invoice number, amount, dates, payment instructions, optional https link), client contact details, delays (checked 1–60 and 2–90, third after second), `reminders_enabled`, `payment_status` (unpaid/paid), `paid_source` (only `freelancer_confirmed`), `consent_at`, `contact_purged_at`.
- **`client_reminders`** (0003) — three per invoice, unique on `(invoice_id, stage)`: subject and body templates, `status`, `due_at` and `next_attempt_at` (UTC), `attempts`, `claim_id`, `sent_at`, `sent_via` (provider/manual), `provider_message_id`, `error_reason`. Indexed on `(status, next_attempt_at)`.
- **`client_reminder_events`** (0003) — history per invoice: stage, event, detail, time.

Personal data: Razorpay purchases store none; Razorpay keeps the buyer's contact details on its side. Follow-ups store the client contact details the freelancer enters, with their confirmation of consent, only for sending the reminders, and remove them 90 days after the last update once nothing is pending. They are returned only to the holder of the follow-up's `manageToken`.

## Costs and free-tier limits

| Service | Plan | Limits that matter | Expected cost |
| --- | --- | --- | --- |
| GitHub Pages | Free | Unchanged | ₹0 |
| Cloudflare Workers | Free | 100,000 requests/day, 10 ms CPU per request, 50 subrequests per request | ₹0. One purchase uses about 4–8 requests. |
| Cloudflare D1 | Free | 5 million rows read/day, 100,000 rows written/day, 5 GB storage. Resets 00:00 UTC. | ₹0. One purchase writes about 6–10 rows. |
| Workers rate limiting | Included | Counters are per Cloudflare location and approximate | ₹0 |
| Razorpay | Standard | Per-transaction fee on each successful payment (check your plan in the Razorpay Dashboard; typically about 2% plus GST on the fee) | The only unavoidable cost. No setup or annual fee on the standard plan. |

If the free limits are exceeded, Workers returns errors until the daily reset; it does not bill you unless you upgrade to Workers Paid (USD 5/month). No paid database is used. The reminder Cron Trigger runs 96 times a day; each run is a few D1 queries. Email is optional; if you add Resend, check its current free-tier limits and pricing.

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

This applies every migration in `migrations/` that has not run yet (0001, 0002 and 0003). Run it again after pulling a branch that adds a migration, before deploying the Worker.

### 5. Secrets

Each command prompts for the value; paste it there, not on the command line.

```bash
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
openssl rand -hex 32          # generate a webhook secret, keep it for step 7
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
```

Secrets are encrypted by Cloudflare and are never part of the code, the frontend bundle, or git.

Optional, for automatic reminder emails: verify a sending domain with [Resend](https://resend.com), create an API key with sending access only, then

```bash
npx wrangler secret put RESEND_API_KEY
```

and set `EMAIL_FROM` (for example `reminders@buildwsai.online`, on the verified domain) under `[vars]` in `wrangler.toml`. Without both, follow-ups work in draft mode and nothing is emailed. `/health` reports `emailDelivery: true` once both are set.

For local development, copy `.dev.vars.example` to `.dev.vars` (git-ignored), fill in test values, then run `npm run db:migrate:local` and `npm run dev`.

### 6. Deploy the Worker

```bash
npm run deploy
curl https://invoice-pack-payments.<your-subdomain>.workers.dev/api/payments/health
```

Expect `{"ok":true,"configured":true,"emailDelivery":false}` (`true` if the email secrets are set). `deploy` prints the exact URL and registers the `*/15 * * * *` Cron Trigger from `wrangler.toml`; check it under **Workers → invoice-pack-payments → Settings → Triggers**.

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
4. Build an invoice in **Create invoice**. Before paying, the preview hides amounts and payment details, and the export panel and Payment follow-ups say they are locked. After the successful payment, click **Export final invoice**: the complete invoice appears and the print dialog opens. Changing the invoice number and exporting again should be refused. Repeat for the Advance Receipt.
5. In **Payment follow-ups**, enter your own second email address as the client, confirm consent and set up follow-ups. Without email secrets, reminders show as drafts. With them, the first reminder arrives within 15 minutes of 10:00 IST on the invoice date. Then try **Mark invoice paid** and check the remaining reminders are cancelled.
6. Check the records:

```bash
cd payments-worker
npx wrangler d1 execute invoice-pack-payments --remote --command "SELECT id, product_id, amount_paise, status, paid_at FROM orders ORDER BY created_at DESC LIMIT 10"
npx wrangler d1 execute invoice-pack-payments --remote --command "SELECT event_type, status, note, attempts FROM webhook_events ORDER BY received_at DESC LIMIT 10"
npx wrangler d1 execute invoice-pack-payments --remote --command "SELECT id, status, export_count, last_export_at FROM orders WHERE export_count > 0 ORDER BY updated_at DESC LIMIT 10"
npx wrangler d1 execute invoice-pack-payments --remote --command "SELECT invoice_id, stage, status, due_at, sent_at, attempts, error_reason FROM client_reminders ORDER BY due_at DESC LIMIT 10"
```

7. In the Razorpay Dashboard → Webhooks, the deliveries should show 200 responses.

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

The tests run the real Worker handler against an in-memory SQLite database loaded from the real migration (standing in for D1) and a fake Razorpay API that signs payments the same way Razorpay does. They cover order creation for both products, rejection of client-supplied amounts, valid and invalid signatures, wrong order, wrong amount, duplicate verification, invalid and duplicate webhooks, failed and cancelled payments, out-of-order events, CORS, rate limiting, that no response contains a secret, protected exports (unpaid, wrong token, wrong product, test-to-live switch, document binding, export cap, recomputed totals, HTML escaping, no content in refused responses), and follow-ups (`test/followups.test.ts`: default and custom schedules, invalid intervals, consent and contact checks, authorization, duplicate and concurrent cron runs, paused reminders, retries with backoff, interrupted sends, mark-paid cancellation including a race with the scheduler, draft mode, test-to-live isolation, contact purge, history, IST and UTC times). They run in CI through `.github/workflows/payments-worker.yml`.

`test/e2e-mock-server.ts` serves the same handler over HTTP for local browser testing, with `MOCK_EMAIL=1` for a fake email outbox and `/__test/cron` to run the scheduler. It is never deployed.

## Known limitations

- **The locked preview is still the customer's own data.** Hidden values are not rendered, but the browser computes the total from what the customer typed, and the summary card shows it. What is protected is the finished document, which only the Worker produces.
- **Follow-ups use the invoice as it was when they were set up.** A later correction to the invoice does not change the amount or due date in scheduled reminders.
- **Email delivery needs setup.** Without `RESEND_API_KEY` and `EMAIL_FROM`, reminders are drafts. The Worker never reports a draft as sent.
- **No WhatsApp sending.** The provider interface in `payments-worker/src/email.ts` is email only; a WhatsApp channel would need a new provider and an approved template with Meta.
- **An interrupted send is not retried automatically** to avoid a duplicate email; the freelancer sees it as failed and can retry.
- **The follow-up `manageToken` lives in one browser**, like the export token.
- **The export token lives in one browser.** Clearing site data or switching devices loses it. The page has no account system, so recovery is manual: look up the order by reference or Razorpay payment id and help by email (support is shown on the page).
- **Direct UPI payments do not unlock exports.** They are confirmed manually, so a UPI customer needs the exported file sent by hand.
- **No purchase receipts by email.** The confirmation shows the order reference and Razorpay payment id on screen. Only client reminders can be emailed, and only when the email secrets are set.
- **Refunds** are not handled by the backend. Refund from the Razorpay Dashboard; the order stays `paid` in D1.
- **A second capture on a paid order** (very rare; Razorpay blocks new payments once an order is paid) is recorded in the `payments` ledger and logged as `second_capture`, and the order keeps its first payment. Refund the extra payment from the Dashboard.
- **Rate limits** are approximate and per Cloudflare location. They stop casual abuse, not a determined distributed attack. Razorpay order creation is free, so the impact of abuse is limited to D1 row writes.
- **Direct UPI payments** remain manual: saving a UTR does not mark anything paid.
