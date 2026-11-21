import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const INVOICE_TITLE = 'Invoice Pack — ₹499 for one client invoice and three reminders'
const INVOICE_DESCRIPTION =
  'Invoice Pack for freelancers in India. ₹499 for one draft invoice and three payment reminders. Advance Receipt is ₹399. Pay by UPI. A UTR is not proof of payment.'
const PORTFOLIO_DESCRIPTION =
  'Sai Vidyut C — Engineer building geospatial intelligence, agent spend guardrails, and deterministic AI systems.'

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
      html = html.replace(
        '<meta name="theme-color" content="#fafafa" />',
        '<meta name="theme-color" content="#efeae2" />',
      )
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
