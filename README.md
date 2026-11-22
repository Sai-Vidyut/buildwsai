# BuildWSai

Curated portfolio for [buildwsai.online](https://buildwsai.online).

> **Invoice Pack** is being split into a dedicated repository: [Sai-Vidyut/invoice-pack](https://github.com/Sai-Vidyut/invoice-pack) (create the repo and push from the migration bundle if it is not live yet — see Project doc `invoice-pack-repository-migration.md`). **Production** at [`/invoice-pack`](https://buildwsai.online/invoice-pack) still deploys from this monorepo until you cut over GitHub Pages or add a redirect.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

1. Push to GitHub
2. Enable Pages → Source: GitHub Actions
3. Push to `main` — `deploy.yml` publishes `dist/`
4. Custom domain: `buildwsai.online` (CNAME in `public/CNAME`)

`/invoice-pack` is Invoice Pack on this same Pages site. The build copies the SPA shell to `dist/invoice-pack/index.html`. A direct request for `/invoice-pack` is handled by `public/404.html`, which loads that shell and restores the clean URL. Vite `base` stays `/`.

## Payments (Razorpay)

Invoice Pack (₹499) is sold through Razorpay Checkout only. Payments are created, verified, and recorded by a Cloudflare Worker with a D1 database in [`payments-worker/`](payments-worker/). The static site stays on GitHub Pages.

- The build reads `VITE_PAYMENTS_API_URL` (GitHub repository variable `PAYMENTS_API_URL`). When it is empty, checkout is unavailable and the page explains how to reach support; documents are not locked behind payment on that build.
- When it is set, the invoice preview hides amounts and payment details, and the final invoice is exported by the Worker only for a paid order (or a free grant / promo code).
- Legacy `advance-receipt` orders in D1 can still download their receipt through the Worker API; Advance Receipt is no longer sold on the site.
- After paying, the freelancer can schedule three payment reminders to their client (day 0/7/14 by default, 10:00 IST). A Cron Trigger emails them when `RESEND_API_KEY` and `EMAIL_FROM` are set; otherwise they are drafts to copy or open in an email app. See [Payment follow-ups](docs/payments/razorpay-setup.md#payment-follow-ups).
- The owner can unlock Invoice Pack for free and issue one-time promotional codes from `/invoice-pack#admin`. Every admin action and every free unlock is authorized by the Worker, and nothing is recorded as a Razorpay payment. See [Free access](docs/payments/razorpay-setup.md#free-access-admin-and-promotional-codes).
- The `/invoice-pack` share image (`public/og-invoice-pack.png`) is the landing page's sample invoice rendered by the Worker's own export template. Regenerate it after changing the sample or the invoice design with `npm run og:invoice-pack` (needs Chrome; set `CHROME_PATH` if it is not on `PATH`).
- Setup, architecture, costs, and the test-to-live switch: [`docs/payments/razorpay-setup.md`](docs/payments/razorpay-setup.md).
- Backend tests: `cd payments-worker && npm ci && npm test`.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS 4
- Motion (`motion/react`) for Invoice Pack transitions; respects reduced motion
- Cloudflare Workers + D1 for the payments API

## Resume

PDF at `public/resume.pdf` for download.
