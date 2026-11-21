import type { FetchLike } from './razorpay.ts'
import { isEmail } from '../../src/invoice-pack/reminders.ts'

export type EmailMessage = {
  to: string
  subject: string
  text: string
  fromName: string
  replyTo: string | null
  // Same key for every attempt at one reminder, so a provider that supports it drops duplicates.
  idempotencyKey: string
}

export type SendResult = { ok: true; id: string } | { ok: false; retryable: boolean; reason: string }

// Channels are adapters behind this interface. Only email exists; WhatsApp needs an approved provider first.
export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage): Promise<SendResult>
}

export type EmailEnv = { RESEND_API_KEY?: string; EMAIL_FROM?: string }

function displayName(name: string): string {
  const safe = name.replace(/["<>\\\r\n]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
  return safe ? `"${safe} via Invoice Pack"` : '"Invoice Pack"'
}

export class ResendProvider implements EmailProvider {
  readonly name = 'resend'
  private readonly apiKey: string
  private readonly from: string
  private readonly fetchImpl: FetchLike

  constructor(apiKey: string, from: string, fetchImpl: FetchLike) {
    this.apiKey = apiKey
    this.from = from
    this.fetchImpl = fetchImpl
  }

  async send(message: EmailMessage): Promise<SendResult> {
    let response: Response
    try {
      response = await this.fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': message.idempotencyKey,
        },
        body: JSON.stringify({
          from: `${displayName(message.fromName)} <${this.from}>`,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      })
    } catch {
      return { ok: false, retryable: true, reason: 'The email provider could not be reached.' }
    }
    if (response.ok) {
      const body = (await response.json().catch(() => null)) as { id?: unknown } | null
      return { ok: true, id: typeof body?.id === 'string' ? body.id.slice(0, 100) : 'unknown' }
    }
    const retryable = response.status === 429 || response.status >= 500
    return { ok: false, retryable, reason: `The email provider refused the message (HTTP ${response.status}).` }
  }
}

export function emailProviderFor(env: EmailEnv, fetchImpl: FetchLike): EmailProvider | null {
  if (!env.RESEND_API_KEY || !isEmail(env.EMAIL_FROM)) return null
  return new ResendProvider(env.RESEND_API_KEY, env.EMAIL_FROM, fetchImpl)
}
