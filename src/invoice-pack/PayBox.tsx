import { useMemo, useState } from 'react'
import { makeQr } from './qr'
import type { Checkout } from './logic'
import { newOrderRef, upiPayUri } from './logic'
import { loadOrders, saveOrder, type StoredOrder } from './storage'
import { copyText } from './copy'

function QrCode({ text, label }: { text: string; label: string }) {
  const grid = useMemo(() => {
    try {
      return makeQr(text)
    } catch {
      return null
    }
  }, [text])
  if (!grid) return <p className="ip-err">The QR could not be drawn. Use the payment link.</p>
  const cell = 4
  const margin = 2
  const size = (grid.count + margin * 2) * cell
  const rects: Array<{ x: number; y: number; key: string }> = []
  for (let row = 0; row < grid.count; row += 1) {
    for (let col = 0; col < grid.count; col += 1) {
      if (!grid.dark(row, col)) continue
      rects.push({ x: (col + margin) * cell, y: (row + margin) * cell, key: row + '-' + col })
    }
  }
  return (
    <svg className="ip-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <rect width={size} height={size} fill="#ffffff" />
      {rects.map((rect) => (
        <rect key={rect.key} x={rect.x} y={rect.y} width={cell} height={cell} fill="#111111" />
      ))}
    </svg>
  )
}

export function PayBox({ checkout }: { checkout: Checkout }) {
  const amount = Number(checkout.am) as 499 | 399
  const [orderRef] = useState(() => newOrderRef(checkout.prefix))
  const uri = upiPayUri(checkout, orderRef)
  const [utr, setUtr] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeError, setNoticeError] = useState('')
  const [copied, setCopied] = useState('Copy payment link')
  const [orders, setOrders] = useState<StoredOrder[]>(() => loadOrders(amount))
  const fieldId = `utr-${checkout.prefix}`

  return (
    <div className="ip-note" data-testid={amount === 499 ? 'pay-499' : 'pay-399'}>
      <h3>Pay ₹{checkout.am}</h3>
      <p>
        Payee name: {checkout.pn}. UPI ID: <strong>{checkout.pa}</strong>. Amount: ₹{checkout.am}.
      </p>
      <p>
        Pay ₹{checkout.am} using UPI, then enter the payment reference from your UPI app so your order can be
        identified.
      </p>
      <p className="ip-fine">
        Saving a reference here does not verify payment or confirm delivery. This page cannot mark an order paid.
      </p>
      <div className="ip-pay-grid">
        <div className="ip-pay-qr">
          <QrCode text={uri} label={`UPI QR for ₹${checkout.am}`} />
        </div>
        <div className="ip-pay-details">
          <p className="ip-pay-ref">
            <span>Order reference</span>
            <strong>{orderRef}</strong>
          </p>
          <p>
            <a href={uri}>UPI payment link</a>
          </p>
          <p className="ip-uri" data-testid={`uri-${checkout.am}`}>
            {uri}
          </p>
          <div className="ip-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                void copyText(uri).then((ok) => setCopied(ok ? 'Copied' : 'Select the link and copy it'))
              }}
            >
              {copied}
            </button>
          </div>
        </div>
      </div>
      <form className="ip-pay-form"
        onSubmit={(event) => {
          event.preventDefault()
          const value = utr.trim()
          if (!/^[A-Za-z0-9]{6,35}$/.test(value)) {
            setNotice('')
            setNoticeError('Enter the UTR or reference: 6 to 35 letters or digits.')
            return
          }
          const order: StoredOrder = {
            orderRef,
            amountInr: amount,
            upiId: checkout.pa,
            uri,
            utr: value,
            status: 'payment_pending',
            savedAt: new Date().toISOString(),
          }
          const stored = saveOrder(order)
          setNoticeError('')
          setNotice(
            stored
              ? 'Saved as payment_pending. This is not proof of payment, and the order is not marked paid. Stored in this browser only.'
              : 'Saved as payment_pending. This is not proof of payment, and the order is not marked paid. This browser blocked local storage. The note above is the only copy.',
          )
          setOrders(loadOrders(amount))
        }}
      >
        <div className="ip-field">
          <label htmlFor={fieldId}>UTR or payment reference</label>
          <input
            id={fieldId}
            name="utr"
            value={utr}
            maxLength={35}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setUtr(event.target.value)}
            required
          />
        </div>
        <button type="submit">Save reference as pending</button>
      </form>
      {noticeError ? (
        <p className="ip-err" role="alert">
          {noticeError}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {orders.length ? (
        <div>
          <h3>References saved on this browser</h3>
          {orders.map((order) => (
            <div key={order.orderRef + order.utr} className="ip-block">
              <p>Order {order.orderRef}</p>
              <p>UTR or reference: {order.utr}</p>
              <p>Status: payment_pending. Not verified. Amount ₹{amount}.</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
