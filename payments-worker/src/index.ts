import { isConfigured, type Env, type RateLimiter } from './env.ts'
import { clientIp, corsHeaders, errorResponse, HttpError, json, parseAllowedOrigins } from './http.ts'
import { createOrder, getOrderStatus, verifyPayment, type Deps } from './payments.ts'
import { RazorpayClient, type FetchLike } from './razorpay.ts'
import { handleWebhook } from './webhook.ts'

const STATUS_ROUTE = /^\/api\/payments\/orders\/([^/]{1,64})$/

async function enforceLimit(limiter: RateLimiter | undefined, key: string): Promise<void> {
  if (!limiter) return
  const { success } = await limiter.limit({ key })
  if (!success) throw new HttpError(429, 'rate_limited', 'Too many requests. Please wait a minute and try again.')
}

export function createHandler(fetchImpl: FetchLike, now: () => Date = () => new Date()) {
  return async function handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const isWebhook = path === '/api/payments/webhook'
    const cors = isWebhook ? {} : corsHeaders(request, parseAllowedOrigins(env.ALLOWED_ORIGINS))

    try {
      if (!path.startsWith('/api/payments/')) throw new HttpError(404, 'not_found', 'Not found.')

      if (!isWebhook) {
        const origin = request.headers.get('Origin')
        if (origin && !('Access-Control-Allow-Origin' in cors)) throw new HttpError(403, 'origin_not_allowed', 'This origin is not allowed.')
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
      }

      if (path === '/api/payments/health' && request.method === 'GET') {
        return json({ ok: true, configured: isConfigured(env) }, 200, cors)
      }

      if (!isConfigured(env)) {
        console.error('config.missing')
        throw new HttpError(503, 'payments_unavailable', 'Online payments are not available right now.')
      }

      const deps: Deps = {
        env,
        razorpay: new RazorpayClient(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET, fetchImpl),
        now,
        headers: cors,
      }

      if (isWebhook) {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        return await handleWebhook(request, env, now)
      }

      if (path === '/api/payments/create-order') {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.ORDER_LIMITER, `create:${clientIp(request)}`)
        return await createOrder(request, deps)
      }

      if (path === '/api/payments/verify') {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.VERIFY_LIMITER, `verify:${clientIp(request)}`)
        return await verifyPayment(request, deps)
      }

      const statusMatch = STATUS_ROUTE.exec(path)
      if (statusMatch) {
        if (request.method !== 'GET') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.VERIFY_LIMITER, `status:${clientIp(request)}`)
        return await getOrderStatus(statusMatch[1], deps)
      }

      throw new HttpError(404, 'not_found', 'Not found.')
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error, cors)
      console.error('unhandled_error', error instanceof Error ? error.name : 'unknown')
      return errorResponse(new HttpError(500, 'internal_error', 'Something went wrong. Please try again.'), cors)
    }
  }
}

const handle = createHandler((input, init) => fetch(input, init))

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
} satisfies ExportedHandler<Env>
