import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const INVOICE_TITLE = 'Invoice Pack for Freelancers | BuildWSai'
const INVOICE_DESCRIPTION =
  'Create a print-ready invoice for a finished freelance job, with GST when it applies, and three payment reminders. ₹499 one-time, for freelancers in India.'
const INVOICE_OG_IMAGE = 'https://buildwsai.online/og-invoice-pack.png'
const INVOICE_OG_IMAGE_ALT =
  'A sample Invoice Pack tax invoice from Example Studio to Sample Client Pvt Ltd, with IGST and a balance due of ₹56,640.'
const PORTFOLIO_OG_IMAGE = 'https://buildwsai.online/og-image.png'
const PORTFOLIO_OG_IMAGE_ALT =
  'BuildWSai — Build with intent. Portfolio of Sai Vidyut C.'
const PORTFOLIO_DESCRIPTION =
  'Sai Vidyut C builds products end-to-end — Peffle, SatQuery AI, DocNA, Slyvr, Invoice Pack. Product thinking, engineering, and design in one loop.'
const PORTFOLIO_THEME_COLOR = '#ebe9e2'

const RESTORE =
  '<script>(function(){try{var k="invoice-pack-spa-path";var stored=sessionStorage.getItem(k);if(stored)sessionStorage.removeItem(k);var search=location.search||"";var hash=location.hash||"";if(stored&&stored.indexOf("/invoice-pack")===0){var hashAt=stored.indexOf("#");var queryAt=stored.indexOf("?");var cut=stored.length;if(hashAt!==-1)cut=Math.min(cut,hashAt);if(queryAt!==-1)cut=Math.min(cut,queryAt);var only=stored.slice(0,cut);if(only==="/invoice-pack"||only==="/invoice-pack/"||only==="/invoice-pack/index.html"){search=queryAt===-1?"":stored.slice(queryAt,hashAt===-1?stored.length:hashAt);hash=hashAt===-1?"":stored.slice(hashAt);}}var target="/invoice-pack"+search+hash;var cur=location.pathname+location.search+location.hash;if(target!==cur)history.replaceState(null,"",target);}catch(e){}})();</script>'

function invoicePackShell(): Plugin {
  return {
    name: 'invoice-pack-pages-shell',
    apply: 'build',
    closeBundle() {
      const indexPath = path.resolve('dist/index.html')
      let html = fs.readFileSync(indexPath, 'utf8')
      html = html.replace('<title>BuildWSai — Sai Vidyut C</title>', `<title>${INVOICE_TITLE}</title>`)
      html = html.replaceAll(PORTFOLIO_DESCRIPTION, INVOICE_DESCRIPTION)
      html = html.replace(
        '<meta property="og:title" content="BuildWSai — Sai Vidyut C" />',
        `<meta property="og:title" content="${INVOICE_TITLE}" />`,
      )
      html = html.replace(
        '<meta name="twitter:title" content="BuildWSai — Sai Vidyut C" />',
        `<meta name="twitter:title" content="${INVOICE_TITLE}" />`,
      )
      html = html.replace(
        '<link rel="canonical" href="https://buildwsai.online/" />',
        '<link rel="canonical" href="https://buildwsai.online/invoice-pack" />',
      )
      html = html.replace(
        '<meta property="og:url" content="https://buildwsai.online/" />',
        '<meta property="og:url" content="https://buildwsai.online/invoice-pack" />',
      )
      html = html.replaceAll(`content="${PORTFOLIO_OG_IMAGE}"`, `content="${INVOICE_OG_IMAGE}"`)
      html = html.replaceAll(`content="${PORTFOLIO_OG_IMAGE_ALT}"`, `content="${INVOICE_OG_IMAGE_ALT}"`)
      html = html.replace(
        `<meta name="theme-color" content="${PORTFOLIO_THEME_COLOR}" />`,
        '<meta name="theme-color" content="#f6f5f2" />',
      )
      const leftovers = [
        PORTFOLIO_DESCRIPTION,
        PORTFOLIO_OG_IMAGE,
        `content="${PORTFOLIO_THEME_COLOR}"`,
        '<title>BuildWSai — Sai Vidyut C</title>',
      ].filter((s) => html.includes(s))
      if (leftovers.length > 0) {
        throw new Error(
          `invoice-pack shell still contains portfolio metadata (index.html and vite.config.ts drifted): ${leftovers.join(' | ')}`,
        )
      }
      if (!html.includes('invoice-pack-spa-path')) {
        html = html.replace('<head>', '<head>\n    ' + RESTORE)
      }
      const outDir = path.resolve('dist/invoice-pack')
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, 'index.html'), html)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), invoicePackShell()],
  base: '/',
})
