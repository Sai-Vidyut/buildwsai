export type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export type Env = {
  DB: D1Database
  RAZORPAY_KEY_ID: string
  RAZORPAY_KEY_SECRET: string
  RAZORPAY_WEBHOOK_SECRET: string
  ALLOWED_ORIGINS?: string
  ORDER_LIMITER?: RateLimiter
  VERIFY_LIMITER?: RateLimiter
  // Optional email delivery for client reminders. Without both, reminders become drafts the freelancer sends.
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
}

export function keyMode(keyId: string): 'test' | 'live' | null {
  if (/^rzp_test_[A-Za-z0-9]+$/.test(keyId)) return 'test'
  if (/^rzp_live_[A-Za-z0-9]+$/.test(keyId)) return 'live'
  return null
}

export function isConfigured(env: Env): boolean {
  return Boolean(env.DB && keyMode(env.RAZORPAY_KEY_ID ?? '') && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET)
}
