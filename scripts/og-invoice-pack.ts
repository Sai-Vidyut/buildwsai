// Renders public/og-invoice-pack.png: the share image for /invoice-pack, showing the landing page's
// sample invoice exactly as the Worker exports it. Needs Chrome; set CHROME_PATH if it is not on PATH.
// Run with: npm run og:invoice-pack
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildPack, demoInput } from '../src/invoice-pack/logic.ts'
import { esc, renderInvoice } from '../payments-worker/src/render.ts'

const WIDTH = 1200
const HEIGHT = 630
const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:opsz,wght@6..72,500&family=IBM+Plex+Mono:wght@400&display=swap'

const invoice = buildPack(demoInput({ gst: true, foreign: false, sameState: false })).invoice
if (!invoice) throw new Error('The sample invoice did not build.')

const sheet = renderInvoice(invoice, 'sample').replace(
  '</head>',
  `<link rel="stylesheet" href="${FONTS}"><style>html{background:transparent}body{padding:0}.ref{display:none}.sheet{border:0;border-radius:0}</style></head>`,
)

const card = `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}">
<style>
*{box-sizing:border-box}
html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
body{position:relative;background:#f5f3ee;color:#191816;font-family:Inter,system-ui,sans-serif}
.copy{position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center}
.eyebrow{margin:0 0 22px;color:#67625b;font-size:17px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.eyebrow b{color:#b4532a;font-weight:600}
h1{margin:0;font-family:Newsreader,Georgia,serif;font-size:66px;font-weight:500;line-height:1.02;letter-spacing:-.02em}
h1 em{color:#b4532a;font-style:normal}
.lede{margin:24px 0 0;color:#34312d;font-size:22px;line-height:1.4}
.price{display:flex;align-items:baseline;gap:14px;margin-top:34px;padding-top:24px;border-top:1px solid #d2ccc1}
.price strong{font-family:Newsreader,Georgia,serif;font-size:46px;font-weight:500}
.price span{color:#67625b;font-size:18px}
.paper{position:absolute;left:600px;top:64px;width:812px;height:900px;transform:scale(.7);transform-origin:0 0;
  background:#fffdf9;border:1px solid #e2ddd4;border-radius:10px;overflow:hidden;
  box-shadow:0 1px 0 rgba(25,24,22,.04),0 40px 80px -36px rgba(48,34,20,.45)}
.paper iframe{width:812px;height:900px;border:0;display:block}
.fade{position:absolute;left:560px;right:0;bottom:0;height:90px;background:linear-gradient(rgba(245,243,238,0),#f5f3ee)}
</style>
</head>
<body>
<div class="copy">
  <p class="eyebrow"><b>Invoice Pack</b> · BuildWSai</p>
  <h1>Print-ready invoice, <em>instantly.</em></h1>
  <p class="lede">For freelancers in India. One GST-aware invoice and three payment reminders.</p>
  <p class="price"><strong>₹499</strong><span>One-time · No subscription</span></p>
</div>
<div class="paper"><iframe title="Sample invoice" srcdoc="${esc(sheet)}"></iframe></div>
<div class="fade"></div>
</body>
</html>`

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-invoice-pack-'))
const htmlPath = path.join(dir, 'card.html')
const out = path.resolve('public/og-invoice-pack.png')
fs.writeFileSync(htmlPath, card)
execFileSync(
  process.env.CHROME_PATH || 'google-chrome',
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--user-data-dir=${path.join(dir, 'profile')}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--screenshot=${out}`,
    `file://${htmlPath}`,
  ],
  { stdio: 'ignore', timeout: 60_000 },
)
fs.rmSync(dir, { recursive: true, force: true })
console.log(`wrote ${path.relative(process.cwd(), out)}`)
