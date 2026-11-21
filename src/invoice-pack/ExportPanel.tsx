import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CONTACT_EMAIL } from './logic'
import { EASE_OUT } from './motion-tokens'
import {
  exportDocument,
  findPaidOrder,
  PAYMENT_CONFIRMED_EVENT,
  PaymentsApiError,
  type ExportKind,
  type ExportResult,
  type HeldOrder,
  type ProductId,
} from './payments-api'
import { scrollToSection } from './scroll-to'

type State =
  | { name: 'checking' }
  | { name: 'locked' }
  | { name: 'unavailable' }
  | { name: 'ready'; order: HeldOrder }
  | { name: 'exporting'; order: HeldOrder }
  | { name: 'done'; order: HeldOrder; result: ExportResult }
  | { name: 'error'; order: HeldOrder; code: string; message: string; details: string[] }

const COPY: Record<ExportKind, { product: ProductId; noun: string; price: number; payId: string }> = {
  invoice: { product: 'invoice-pack', noun: 'invoice', price: 499, payId: 'pay-499' },
  receipt: { product: 'advance-receipt', noun: 'receipt', price: 399, payId: 'pay-399' },
}

// Prints server-rendered HTML in a sandboxed frame: no scripts run, and it never shares the page's DOM.
function printHtml(html: string) {
  document.getElementById('ip-export-frame')?.remove()
  const frame = document.createElement('iframe')
  frame.id = 'ip-export-frame'
  frame.title = 'Exported document'
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
  frame.srcdoc = html
  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch {
      // The download link remains available if printing is blocked.
    }
  }
  document.body.appendChild(frame)
}

function downloadHtml(html: string, filename: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function ExportPanel({ kind, getInput }: { kind: ExportKind; getInput: () => unknown }) {
  const copy = COPY[kind]
  const [state, setState] = useState<State>({ name: 'checking' })
  const busy = useRef(false)

  const [checkNonce, setCheckNonce] = useState(0)
  const refresh = useCallback(() => setCheckNonce((n) => n + 1), [])

  useEffect(() => {
    let active = true
    findPaidOrder(copy.product)
      .then((order) => {
        if (!active) return
        setState((current) => (current.name === 'done' && order ? current : order ? { name: 'ready', order } : { name: 'locked' }))
      })
      .catch(() => {
        if (active) setState({ name: 'unavailable' })
      })
    return () => {
      active = false
    }
  }, [copy.product, checkNonce])

  useEffect(() => {
    const onPaid = (event: Event) => {
      if ((event as CustomEvent<{ productId?: string }>).detail?.productId === copy.product) refresh()
    }
    window.addEventListener(PAYMENT_CONFIRMED_EVENT, onPaid)
    return () => window.removeEventListener(PAYMENT_CONFIRMED_EVENT, onPaid)
  }, [refresh, copy.product])

  async function runExport(order: HeldOrder) {
    if (busy.current) return
    busy.current = true
    setState({ name: 'exporting', order })
    try {
      const result = await exportDocument(kind, order, getInput())
      setState({ name: 'done', order, result })
      printHtml(result.html)
    } catch (error) {
      if (error instanceof PaymentsApiError && (error.code === 'not_entitled' || error.code === 'payment_required')) {
        setState({ name: 'locked' })
        return
      }
      setState({
        name: 'error',
        order,
        code: error instanceof PaymentsApiError ? error.code : 'unknown',
        message: error instanceof PaymentsApiError ? error.message : 'Something went wrong. Please try again.',
        details: error instanceof PaymentsApiError ? error.details : [],
      })
    } finally {
      busy.current = false
    }
  }

  return (
    <div className="ip-export no-print" data-testid={`export-${kind}`} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {state.name === 'checking' ? (
            <p className="ip-export-note">
              <span className="ip-spinner" aria-hidden="true" /> Checking for a paid order in this browser…
            </p>
          ) : null}

          {state.name === 'locked' ? (
            <>
              <p className="ip-export-title">
                <span className="ip-export-lock" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="13" height="13">
                    <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
                Final {copy.noun} export is locked
              </p>
              <p className="ip-export-note">
                The preview is a watermarked draft. Pay ₹{copy.price} once to export the final {copy.noun} without the
                watermark, from this browser.
              </p>
              <button type="button" className="ip-btn" onClick={() => scrollToSection(copy.payId)} data-testid={`export-pay-${kind}`}>
                Pay ₹{copy.price} to export
                <span className="ip-btn-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </>
          ) : null}

          {state.name === 'unavailable' ? (
            <div className="ip-rzp-status ip-rzp-status--warn" role="status">
              <p>We could not check your payment right now. Check your connection, then try again.</p>
              <button type="button" className="ip-plain ip-rzp-link" onClick={refresh}>
                Check again
              </button>
            </div>
          ) : null}

          {state.name === 'ready' || state.name === 'exporting' || state.name === 'done' || state.name === 'error' ? (
            <>
              <p className="ip-export-title">
                <span className="ip-rzp-check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Paid · order {state.order.ref}
              </p>
              <p className="ip-export-note">
                Exporting sends these details to our server, which builds the final {copy.noun} and does not keep them.
                One order covers one {copy.noun}{kind === 'invoice' ? ' number' : ' client'}; you can re-export it with
                corrections.
              </p>
              <div className="ip-actions">
                <button
                  type="button"
                  className="ip-btn"
                  disabled={state.name === 'exporting'}
                  aria-busy={state.name === 'exporting'}
                  onClick={() => void runExport(state.order)}
                  data-testid={`export-run-${kind}`}
                >
                  {state.name === 'exporting' ? <span className="ip-spinner" aria-hidden="true" /> : null}
                  {state.name === 'exporting' ? 'Preparing…' : `Export final ${copy.noun}`}
                </button>
                {state.name === 'done' ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => downloadHtml(state.result.html, state.result.filename)}
                    data-testid={`export-download-${kind}`}
                  >
                    Download file
                  </button>
                ) : null}
              </div>
              {state.name === 'done' ? (
                <p className="ip-rzp-status ip-rzp-status--info" role="status">
                  Exported. Use the print dialog to save as PDF. {state.result.exportsUsed} of {state.result.exportsLimit}{' '}
                  exports used for this order.
                </p>
              ) : null}
              {state.name === 'error' ? (
                <div className="ip-rzp-status ip-rzp-status--err" role="alert">
                  <p>{state.message}</p>
                  {state.details.length ? (
                    <ul>
                      {state.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                  {state.code === 'document_mismatch' || state.code === 'export_limit' ? (
                    <p>
                      Need help? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with order {state.order.ref}.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
