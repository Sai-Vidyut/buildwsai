// Local-only server for browser testing: the real Worker handler, a fake Razorpay API, and SQLite as D1.
// Not deployed. Run with: node --experimental-strip-types test/e2e-mock-server.ts
import { createServer } from 'node:http'
import { createHandler } from '../src/index.ts'
import { checkoutSignature, createD1, FakeRazorpay, KEY_ID, KEY_SECRET, WEBHOOK_SECRET } from './helpers.ts'

const PORT = Number(process.env.PORT ?? 8788)
const { d1 } = createD1()
const razorpay = new FakeRazorpay()
const handle = createHandler(razorpay.fetch)
const env = {
  DB: d1,
  RAZORPAY_KEY_ID: KEY_ID,
  RAZORPAY_KEY_SECRET: KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:4173,http://localhost:4173',
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
  const cors = { 'Access-Control-Allow-Origin': req.headers.origin ?? '*' }

  // Test-only stand-in for the Razorpay checkout popup completing a payment.
  if (url.pathname === '/__test/pay') {
    const orderId = url.searchParams.get('order_id') ?? ''
    const status = url.searchParams.get('status') ?? 'captured'
    const payment = razorpay.addPayment(orderId, { status })
    const body = { razorpay_order_id: orderId, razorpay_payment_id: payment.id, razorpay_signature: await checkoutSignature(orderId, payment.id) }
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors }).end(JSON.stringify(body))
    return
  }
  if (url.pathname === '/__test/capture') {
    const payment = razorpay.payments.get(url.searchParams.get('payment_id') ?? '')
    if (payment) payment.status = 'captured'
    res.writeHead(200, cors).end('ok')
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const request = new Request(url, {
    method: req.method,
    headers: Object.entries(req.headers).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : [])),
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
  })
  const response = await handle(request, env)
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
}).listen(PORT, '127.0.0.1', () => console.log(`mock payments API on http://127.0.0.1:${PORT}`))
