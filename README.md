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

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS 4
- No animation libraries — CSS transitions + IntersectionObserver only

## Resume

PDF at `public/resume.pdf` for download.
