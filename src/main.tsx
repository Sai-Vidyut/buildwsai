import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.tsx'
import { isInvoicePackPath } from './lib/route.ts'
import { startSmoothScroll } from './lib/smoothScroll'
import './index.css'

if (!isInvoicePackPath(window.location.pathname)) startSmoothScroll()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
