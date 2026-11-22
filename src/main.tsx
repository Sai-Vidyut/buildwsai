import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.tsx'
import './index.css'

// This server only hosts the portfolio. Slyvr is the nested app on the public site.
// A local /slyvr request otherwise falls through to this shell and shows the hero.
const path = window.location.pathname
if (
  window.location.hostname !== 'buildwsai.online' &&
  (path === '/slyvr' || path.startsWith('/slyvr/'))
) {
  window.location.replace(
    'https://buildwsai.online' + path + window.location.search + window.location.hash,
  )
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  )
}
