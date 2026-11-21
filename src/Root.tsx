import { Suspense, lazy } from 'react'
import App from './App.tsx'
import { isInvoicePackPath } from './lib/route.ts'

const InvoicePackPage = lazy(() => import('./invoice-pack/InvoicePackPage.tsx'))

export default function Root() {
  if (!isInvoicePackPath(window.location.pathname)) return <App />
  return (
    <Suspense
      fallback={
        <p style={{ padding: '2rem', fontFamily: 'Georgia, serif', background: '#f6f5f2' }}>
          Loading Invoice Pack…
        </p>
      }
    >
      <InvoicePackPage />
    </Suspense>
  )
}
