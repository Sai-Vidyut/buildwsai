import { claimAdminGrant, expirePromoCodes, getGrantStatus, handleAdmin, redeemPromoCode } from './access.ts'
import { emailProviderFor, type EmailProvider } from './email.ts'
import { isConfigured, type Env, type RateLimiter } from './env.ts'
import { clientIp, corsHeaders, errorResponse, HttpError, json, parseAllowedOrigins } from './http.ts'
import { exportDocument } from './exports.ts'
import { createFollowup, manageFollowup, runDueReminders } from './followups.ts'
import { createOrder, getOrderStatus, verifyPayment, type Deps } from './payments.ts'
import { RazorpayClient, type FetchLike } from './razorpay.ts'
import { handleWebhook } from './webhook.ts'

const STATUS_ROUTE = /^\/api\/payments\/orders\/([^/]{1,64})$/
const GRANT_STATUS_ROUTE = /^\/api\/payments\/grants\/(GR-[^/]{1,61})$/

async function enforceLimit(limiter: RateLimiter | undefined, key: string): Promise<void> {
  if (!limiter) return
  const { success } = await limiter.limit({ key })
  if (!success) throw new HttpError(429, 'rate_limited', 'Too many requests. Please wait a minute and try again.')
}

export type HandlerOptions = { emailProvider?: (env: Env) => EmailProvider | null }

export function createHandler(fetchImpl: FetchLike, now: () => Date = () => new Date(), options: HandlerOptions = {}) {
  const providerFor = options.emailProvider ?? ((env: Env) => emailProviderFor(env, fetchImpl))

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
        return json({ ok: true, configured: isConfigured(env), emailDelivery: providerFor(env) !== null }, 200, cors)
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

      if (path === '/api/payments/exports/invoice' || path === '/api/payments/exports/receipt') {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.VERIFY_LIMITER, `export:${clientIp(request)}`)
        return await exportDocument(path.endsWith('/invoice') ? 'invoice' : 'receipt', request, deps)
      }

      if (path === '/api/payments/followups' || path === '/api/payments/followups/manage') {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.VERIFY_LIMITER, `followup:${clientIp(request)}`)
        const provider = providerFor(env)
        return path.endsWith('/manage') ? await manageFollowup(request, deps, provider) : await createFollowup(request, deps, provider)
      }

      if (path === '/api/payments/admin') {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.ADMIN_LIMITER ?? env.ORDER_LIMITER, `admin:${clientIp(request)}`)
        return await handleAdmin(request, deps)
      }

      if (path === '/api/payments/grants/redeem' || path === '/api/payments/grants/admin') {
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.ORDER_LIMITER, `grant:${clientIp(request)}`)
        return path.endsWith('/redeem') ? await redeemPromoCode(request, deps) : await claimAdminGrant(request, deps)
      }

      const grantMatch = GRANT_STATUS_ROUTE.exec(path)
      if (grantMatch) {
        if (request.method !== 'GET') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        await enforceLimit(env.VERIFY_LIMITER, `status:${clientIp(request)}`)
        return await getGrantStatus(grantMatch[1], deps)
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

const fetchImpl: FetchLike = (input, init) => fetch(input, init)
const handle = createHandler(fetchImpl)

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
  scheduled: (_controller, env, ctx) => {
    if (!env.DB) return
    ctx.waitUntil(
      runDueReminders(env, emailProviderFor(env, fetchImpl), new Date())
        .then((result) => console.log('reminders.run', JSON.stringify(result)))
        .catch((error) => console.error('reminders.run_failed', error instanceof Error ? error.name : 'unknown')),
    )
    ctx.waitUntil(
      expirePromoCodes(env.DB, new Date()).catch((error) => console.error('promo.expire_failed', error instanceof Error ? error.name : 'unknown')),
    )
  },
} satisfies ExportedHandler<Env>
