const encoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)))
}

export async function sha256Hex(message: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(message)))
}

// Compares two hex digests without short-circuiting on the first differing byte.
export function timingSafeEqualHex(a: string, b: string): boolean {
  const left = encoder.encode(a.toLowerCase())
  const right = encoder.encode(b.toLowerCase())
  let diff = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  return diff === 0
}

export async function verifyHmac(secret: string, message: string, signature: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false
  return timingSafeEqualHex(await hmacSha256Hex(secret, message), signature)
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// 20 symbols from a 32-symbol alphabet: 100 bits of randomness, so refs are unguessable.
export function newOrderRef(prefix: 'IP' | 'AR'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return `${prefix}-${Array.from(bytes, (b) => REF_ALPHABET[b & 31]).join('')}`
}

export const ORDER_REF_PATTERN = /^(IP|AR)-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/

export function newFollowupId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return `FU-${Array.from(bytes, (b) => REF_ALPHABET[b & 31]).join('')}`
}

export const FOLLOWUP_ID_PATTERN = /^FU-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{20}$/

export function newClaimId(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer)
}

// 256-bit bearer secret that proves this browser created the order. Only its SHA-256 is stored.
export function newAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
