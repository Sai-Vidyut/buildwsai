import { buildPack, buildReceipt, type LineInput, type PackInput, type ReceiptInput } from '../../src/invoice-pack/logic.ts'
import { ACCESS_TOKEN_PATTERN, ORDER_REF_PATTERN, sha256Hex, timingSafeEqualHex } from './crypto.ts'
import { keyMode } from './env.ts'
import { HttpError, json, readJsonObject, rejectUnknownFields } from './http.ts'
import { getOrderById, type OrderRow } from './orders.ts'
import type { Deps } from './payments.ts'
import type { ProductId } from './products.ts'
import { renderInvoice, renderReceipt } from './render.ts'

export type ExportKind = 'invoice' | 'receipt'

export const EXPORT_LIMIT = 20
const MAX_EXPORT_BODY = 16 * 1024
const MAX_TEXT = 400
const MAX_LINES = 30

const PRODUCT_FOR: Record<ExportKind, ProductId> = { invoice: 'invoice-pack', receipt: 'advance-receipt' }

const PACK_TEXT_FIELDS = [
  'supplierName', 'supplierAddress', 'supplierState', 'supplierGstin', 'clientName', 'clientAddress', 'clientState',
  'clientGstin', 'invoiceNumber', 'invoiceDate', 'sac', 'upi', 'bankName', 'accountName', 'accountNumber', 'ifsc', 'remarks',
] as const
const PACK_NUMERIC_FIELDS = ['dueDays', 'gstRate', 'alreadyReceived'] as const
const PACK_FLAG_FIELDS = ['foreignClient', 'gstRegistered', 'reverseCharge'] as const
const RECEIPT_TEXT_FIELDS = [
  'seller', 'place', 'upi', 'client', 'job', 'jobDate', 'receiptDate', 'total', 'advance', 'included', 'excluded',
] as const

const invalidInput = () => new HttpError(400, 'invalid_document', 'Some document details are missing or too long.')

function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.length > MAX_TEXT) throw invalidInput()
  return value
}

function numeric(value: unknown): string | number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.length <= 20) return value
  throw invalidInput()
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidInput()
  return value as Record<string, unknown>
}

// Copies only known fields with checked types, so nothing unexpected reaches the document builder.
export function sanitizePackInput(raw: unknown): PackInput {
  const src = record(raw)
  const out: Record<string, unknown> = {}
  for (const key of PACK_TEXT_FIELDS) out[key] = text(src[key])
  for (const key of PACK_NUMERIC_FIELDS) out[key] = numeric(src[key])
  for (const key of PACK_FLAG_FIELDS) {
    if (src[key] !== undefined && typeof src[key] !== 'boolean') throw invalidInput()
    out[key] = src[key]
  }
  if (src.lines !== undefined) {
    if (!Array.isArray(src.lines) || src.lines.length > MAX_LINES) throw invalidInput()
    out.lines = src.lines.map((line): LineInput => {
      const item = record(line)
      return { description: text(item.description), amount: numeric(item.amount) }
    })
  }
  return out as PackInput
}

export function sanitizeReceiptInput(raw: unknown): ReceiptInput {
  const src = record(raw)
  const out: Record<string, unknown> = {}
  for (const key of RECEIPT_TEXT_FIELDS) out[key] = text(src[key])
  return out as ReceiptInput
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function invoiceDocumentKey(invoiceNumber: string): Promise<string> {
  return sha256Hex(`invoice:${normalize(invoiceNumber)}`)
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'document'
}

const notEntitled = () =>
  new HttpError(403, 'not_entitled', 'This browser does not hold a paid order for this document. Pay first, or use the browser you paid in.')

// The single server-side entitlement check: the order exists, the browser holds its secret,
// it was paid with the current key mode, and it is for this product.
export async function authorizePaidOrder(orderRef: unknown, accessToken: unknown, kind: ExportKind, deps: Deps): Promise<OrderRow> {
  if (typeof orderRef !== 'string' || !ORDER_REF_PATTERN.test(orderRef) || typeof accessToken !== 'string' || !ACCESS_TOKEN_PATTERN.test(accessToken)) {
    throw notEntitled()
  }
  const order = await getOrderById(deps.env.DB, orderRef)
  const presented = await sha256Hex(accessToken)
  if (!order || !order.access_token_hash || !timingSafeEqualHex(presented, order.access_token_hash)) throw notEntitled()
  // A test-mode payment must never unlock exports once live keys are configured, and vice versa.
  if (order.mode !== keyMode(deps.env.RAZORPAY_KEY_ID)) throw notEntitled()
  if (order.product_id !== PRODUCT_FOR[kind]) {
    throw new HttpError(403, 'wrong_product', kind === 'invoice' ? 'This order is for Advance Receipt, not Invoice Pack.' : 'This order is for Invoice Pack, not Advance Receipt.')
  }
  if (order.status !== 'paid') {
    throw new HttpError(402, 'payment_required', 'This order is not confirmed as paid yet. Try again once the payment is confirmed.')
  }
  return order
}

export const documentMismatch = () =>
  new HttpError(409, 'document_mismatch', 'This order is already used for a different invoice number. Each order covers one invoice.')

export async function exportDocument(kind: ExportKind, request: Request, deps: Deps): Promise<Response> {
  const body = await readJsonObject(request, MAX_EXPORT_BODY)
  rejectUnknownFields(body, ['orderRef', 'accessToken', 'input'])
  const order = await authorizePaidOrder(body.orderRef, body.accessToken, kind, deps)

  let html: string
  let filename: string
  let identity: string
  if (kind === 'invoice') {
    const result = buildPack(sanitizePackInput(body.input))
    if (!result.ok || !result.invoice) {
      return json({ error: { code: 'document_incomplete', message: 'Fix the details below, then export again.', details: result.errors.slice(0, 10) } }, 422, deps.headers)
    }
    html = renderInvoice(result.invoice, order.id)
    filename = `invoice-${safeFilePart(result.invoice.invoiceNumber)}.html`
    identity = `invoice:${normalize(result.invoice.invoiceNumber)}`
  } else {
    const result = buildReceipt(sanitizeReceiptInput(body.input))
    if (!result.ok || !result.receipt) {
      return json({ error: { code: 'document_incomplete', message: 'Fix the details below, then export again.', details: result.errors.slice(0, 10) } }, 422, deps.headers)
    }
    html = renderReceipt(result.receipt, result.message, order.id)
    filename = `advance-receipt-${safeFilePart(result.receipt.client)}.html`
    identity = `receipt:${normalize(result.receipt.client)}`
  }

  const documentKey = await sha256Hex(identity)
  const now = deps.now().toISOString()
  const claimed = await deps.env.DB.prepare(
    `UPDATE orders SET document_key = COALESCE(document_key, ?), export_count = export_count + 1, last_export_at = ?, updated_at = ?
     WHERE id = ? AND status = 'paid' AND (document_key IS NULL OR document_key = ?) AND export_count < ?`,
  )
    .bind(documentKey, now, now, order.id, documentKey, EXPORT_LIMIT)
    .run()

  if (claimed.meta.changes === 0) {
    const fresh = await getOrderById(deps.env.DB, order.id)
    if (fresh?.document_key && fresh.document_key !== documentKey) {
      if (kind === 'invoice') throw documentMismatch()
      throw new HttpError(409, 'document_mismatch', 'This order is already used for a receipt to a different client. Each order covers one receipt.')
    }
    throw new HttpError(429, 'export_limit', `This order has reached its limit of ${EXPORT_LIMIT} exports.`)
  }

  const after = await getOrderById(deps.env.DB, order.id)
  return json({ html, filename, exportsUsed: after?.export_count ?? 0, exportsLimit: EXPORT_LIMIT }, 200, deps.headers)
}
