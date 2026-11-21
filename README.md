# BuildWSai

Curated portfolio for [buildwsai.online](https://buildwsai.online).

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

Invoice Pack (₹499) and Advance Receipt (₹399) can be paid through Razorpay Checkout or by direct UPI. Razorpay payments are created, verified, and recorded by a Cloudflare Worker with a D1 database in [`payments-worker/`](payments-worker/). The static site stays on GitHub Pages.

- The build reads `VITE_PAYMENTS_API_URL` (GitHub repository variable `PAYMENTS_API_URL`). When it is empty, only the direct UPI option is shown.
- Setup, architecture, costs, and the test-to-live switch: [`docs/payments/razorpay-setup.md`](docs/payments/razorpay-setup.md).
- Backend tests: `cd payments-worker && npm ci && npm test`.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS 4
- Motion (`motion/react`) for Invoice Pack transitions; respects reduced motion
- Cloudflare Workers + D1 for the payments API

## Resume

PDF at `public/resume.pdf` for download.
