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

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS 4
- No animation libraries — CSS transitions + IntersectionObserver only

## Resume

PDF at `public/resume.pdf` for download.
