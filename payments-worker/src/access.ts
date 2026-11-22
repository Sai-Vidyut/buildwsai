import { isEmail } from '../../src/invoice-pack/reminders.ts'
import {
  ACCESS_TOKEN_PATTERN,
  ADMIN_PASS_ID_PATTERN,
  canonicalPromoCode,
  GRANT_REF_PATTERN,
  newAccessRef,
  newAccessToken,
  newPromoCode,
  PROMO_ID_PATTERN,
  sha256Hex,
  timingSafeEqualHex,
} from './crypto.ts'
import { keyMode, type Env } from './env.ts'
import { HttpError, json, readJsonObject, rejectUnknownFields } from './http.ts'
import type { Deps } from './payments.ts'

// Free access never writes to `orders`, `payments` or `webhook_events`: it is recorded as an access grant,
// which the export and follow-up endpoints authorize exactly like a paid order.

const ADMIN_KEY_HASH = /^[0-9a-f]{64}$/
const BEARER = /^Bearer ([A-Za-z0-9._~+/=-]{32,256})$/
const MAX_EXPIRY_MS = 366 * 24 * 60 * 60 * 1000
const MAX_NOTE = 80
const MAX_LABEL = 40

type Mode = 'test' | 'live'
type Actor = 'admin' | 'holder' | 'system'

type AdminPassRow = {
  id: string
  label: string
  token_hash: string
  mode: Mode
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

type PromoCodeRow = {
  id: string
  code_hash: string
  code_hint: string
  mode: Mode
  note: string | null
  bound_email: string | null
  expires_at: string | null
  created_at: string
  redeemed_at: string | null
  redeemed_email: string | null
  grant_id: string | null
  revoked_at: string | null
  expired_at: string | null
}

export type PromoStatus = 'unused' | 'redeemed' | 'expired' | 'revoked'

const unavailable = () => new HttpError(503, 'payments_unavailable', 'Online payments are not available right now.')
const invalidCode = () => new HttpError(403, 'code_invalid', 'This code is not valid, has expired, or has already been used.')
const invalidPass = () => new HttpError(403, 'admin_pass_invalid', 'This browser’s admin access is no longer valid. Set it up again from the admin page.')

function currentMode(env: Env): Mode {
  const mode = keyMode(env.RAZORPAY_KEY_ID)
  if (!mode) throw unavailable()
  return mode
}

function promoCodeHash(canonical: string): Promise<string> {
  return sha256Hex(`promo:${canonical}`)
}

function normalizeEmail(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  const email = typeof value === 'string' ? value.trim().toLowerCase() : value
  if (!isEmail(email)) throw new HttpError(400, 'invalid_email', `Enter a valid ${field}.`)
  return email
}

async function logAccessEvent(db: D1Database, type: 'admin_pass' | 'promo_code', id: string, event: string, actor: Actor, detail: string | null, at: string) {
  await db
    .prepare('INSERT INTO access_events (subject_type, subject_id, event, actor, detail, at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(type, id, event, actor, detail, at)
    .run()
}

// Records an `expired` event once for each unused code whose expiry has passed. Status is always computed
// from `expires_at`, so a code is refused the moment it expires even before this runs.
export async function expirePromoCodes(db: D1Database, now: Date): Promise<number> {
  const nowIso = now.toISOString()
  const { results } = await db
    .prepare(
      `UPDATE promo_codes SET expired_at = ?1
       WHERE expired_at IS NULL AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at IS NOT NULL AND expires_at <= ?1
       RETURNING id`,
    )
    .bind(nowIso)
    .all<{ id: string }>()
  for (const { id } of results) await logAccessEvent(db, 'promo_code', id, 'expired', 'system', null, nowIso)
  return results.length
}

export function promoStatus(row: PromoCodeRow, nowIso: string): PromoStatus {
  if (row.revoked_at) return 'revoked'
  if (row.redeemed_at) return 'redeemed'
  if (row.expires_at && row.expires_at <= nowIso) return 'expired'
  return 'unused'
}

// ---- Admin authentication -------------------------------------------------------------------------

// The admin key is a high-entropy secret only the owner holds. The Worker stores its SHA-256 as the
// ADMIN_KEY_SHA256 secret, so neither the frontend, the repository nor D1 ever contains the key.
export async function requireAdmin(request: Request, env: Env): Promise<void> {
  const expected = env.ADMIN_KEY_SHA256?.trim().toLowerCase()
  if (!expected || !ADMIN_KEY_HASH.test(expected)) throw new HttpError(404, 'not_found', 'Not found.')
  const match = BEARER.exec(request.headers.get('Authorization') ?? '')
  const presented = match ? await sha256Hex(match[1]) : ''
  if (!match || !timingSafeEqualHex(presented, expected)) {
    console.warn('admin.auth_failed')
    throw new HttpError(401, 'admin_unauthorized', 'The admin key is not valid.')
  }
}

// ---- Admin actions --------------------------------------------------------------------------------

const ADMIN_FIELDS: Record<string, readonly string[]> = {
  overview: [],
  create_code: ['email', 'expiresAt', 'note'],
  revoke_code: ['codeId'],
  create_admin_pass: ['label'],
  revoke_admin_pass: ['passId'],
}

function codeView(row: PromoCodeRow, nowIso: string) {
  return {
    id: row.id,
    hint: row.code_hint,
    mode: row.mode,
    note: row.note,
    boundEmail: row.bound_email,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    status: promoStatus(row, nowIso),
    redeemedAt: row.redeemed_at,
    redeemedEmail: row.redeemed_email,
    grantRef: row.grant_id,
    revokedAt: row.revoked_at,
  }
}

function passView(row: AdminPassRow, mode: Mode) {
  return {
    id: row.id,
    label: row.label,
    mode: row.mode,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    status: row.revoked_at ? 'revoked' : row.mode !== mode ? 'other_mode' : 'active',
  }
}

function parseExpiry(value: unknown, now: Date): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 40) throw new HttpError(400, 'invalid_expiry', 'Enter a valid expiry date.')
  // A bare date means the end of that day in India.
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59+05:30` : value)
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, 'invalid_expiry', 'Enter a valid expiry date.')
  if (parsed.getTime() <= now.getTime()) throw new HttpError(400, 'invalid_expiry', 'The expiry must be in the future.')
  if (parsed.getTime() - now.getTime() > MAX_EXPIRY_MS) throw new HttpError(400, 'invalid_expiry', 'The expiry can be at most one year away.')
  return parsed.toISOString()
}

function parseText(value: unknown, max: number, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > max || /[\r\n\t]/.test(value)) {
    throw new HttpError(400, 'invalid_text', `${field} must be a single line of at most ${max} characters.`)
  }
  return value.trim() || null
}

export async function handleAdmin(request: Request, deps: Deps): Promise<Response> {
  await requireAdmin(request, deps.env)
  const db = deps.env.DB
  const mode = currentMode(deps.env)
  const body = await readJsonObject(request)
  const action = typeof body.action === 'string' && Object.hasOwn(ADMIN_FIELDS, body.action) ? body.action : null
  if (!action) throw new HttpError(400, 'invalid_action', 'Choose a valid action.')
  rejectUnknownFields(body, ['action', ...ADMIN_FIELDS[action]])
  const now = deps.now()
  const nowIso = now.toISOString()

  switch (action) {
    case 'create_code': {
      const boundEmail = normalizeEmail(body.email, 'email address for this code')
      const expiresAt = parseExpiry(body.expiresAt, now)
      const note = parseText(body.note, MAX_NOTE, 'The note')
      const code = newPromoCode()
      const id = newAccessRef('PC')
      await db
        .prepare(
          `INSERT INTO promo_codes (id, code_hash, code_hint, mode, note, bound_email, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, await promoCodeHash(code), code.slice(-4), mode, note, boundEmail, expiresAt, nowIso)
        .run()
      await logAccessEvent(db, 'promo_code', id, 'created', 'admin', boundEmail ? `For ${boundEmail}` : null, nowIso)
      const row = await db.prepare('SELECT * FROM promo_codes WHERE id = ?').bind(id).first<PromoCodeRow>()
      // The plaintext code is returned only here; the server keeps its hash.
      return json({ code, promoCode: codeView(row!, nowIso) }, 201, deps.headers)
    }

    case 'revoke_code': {
      if (typeof body.codeId !== 'string' || !PROMO_ID_PATTERN.test(body.codeId)) throw new HttpError(400, 'invalid_code_id', 'Choose a valid code.')
      const revoked = await db
        .prepare('UPDATE promo_codes SET revoked_at = ? WHERE id = ? AND redeemed_at IS NULL AND revoked_at IS NULL')
        .bind(nowIso, body.codeId)
        .run()
      if (!revoked.meta.changes) throw new HttpError(409, 'code_not_revocable', 'Only an unused code can be revoked.')
      await logAccessEvent(db, 'promo_code', body.codeId, 'revoked', 'admin', null, nowIso)
      break
    }

    case 'create_admin_pass': {
      const label = parseText(body.label, MAX_LABEL, 'The label') ?? 'My browser'
      const passToken = newAccessToken()
      const id = newAccessRef('AP')
      await db
        .prepare('INSERT INTO admin_passes (id, label, token_hash, mode, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, label, await sha256Hex(passToken), mode, nowIso)
        .run()
      await logAccessEvent(db, 'admin_pass', id, 'created', 'admin', label, nowIso)
      // The pass token is returned only here; the browser keeps it and the server keeps its hash.
      return json({ passId: id, passToken, mode }, 201, deps.headers)
    }

    case 'revoke_admin_pass': {
      if (typeof body.passId !== 'string' || !ADMIN_PASS_ID_PATTERN.test(body.passId)) throw new HttpError(400, 'invalid_pass_id', 'Choose a valid admin pass.')
      const revoked = await db
        .prepare('UPDATE admin_passes SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
        .bind(nowIso, body.passId)
        .run()
      if (!revoked.meta.changes) throw new HttpError(409, 'pass_not_revocable', 'This admin pass is already revoked or does not exist.')
      await logAccessEvent(db, 'admin_pass', body.passId, 'revoked', 'admin', null, nowIso)
      break
    }
  }

  await expirePromoCodes(db, now)
  const [passes, codes, events] = await Promise.all([
    db.prepare('SELECT * FROM admin_passes ORDER BY created_at DESC LIMIT 50').all<AdminPassRow>(),
    db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC, id LIMIT 200').all<PromoCodeRow>(),
    db
      .prepare('SELECT subject_type, subject_id, event, actor, detail, at FROM access_events ORDER BY id DESC LIMIT 100')
      .all<{ subject_type: string; subject_id: string; event: string; actor: string; detail: string | null; at: string }>(),
  ])
  return json(
    {
      mode,
      adminPasses: passes.results.map((row) => passView(row, mode)),
      codes: codes.results.map((row) => codeView(row, nowIso)),
      events: events.results.map((e) => ({ subjectType: e.subject_type, subjectId: e.subject_id, event: e.event, actor: e.actor, detail: e.detail, at: e.at })),
    },
    200,
    deps.headers,
  )
}

// ---- Public: redeem a promo code ------------------------------------------------------------------

function grantResponse(grantRef: string, accessToken: string, source: 'admin_grant' | 'promo_grant', deps: Deps) {
  return json({ grantRef, accessToken, productId: 'invoice-pack', source }, 201, deps.headers)
}

async function rejectionReason(row: PromoCodeRow, email: string | null, mode: Mode, nowIso: string): Promise<string> {
  const status = promoStatus(row, nowIso)
  if (status !== 'unused') return status === 'redeemed' ? 'already redeemed' : status
  if (row.mode !== mode) return 'other key mode'
  if (row.bound_email && row.bound_email !== email) return 'email mismatch'
  return 'not redeemable'
}

export async function redeemPromoCode(request: Request, deps: Deps): Promise<Response> {
  const db = deps.env.DB
  const mode = currentMode(deps.env)
  const body = await readJsonObject(request)
  rejectUnknownFields(body, ['code', 'email'])
  const canonical = canonicalPromoCode(body.code)
  if (!canonical) throw invalidCode()
  const email = normalizeEmail(body.email, 'email address')
  const now = deps.now()
  const nowIso = now.toISOString()
  await expirePromoCodes(db, now)

  const codeHash = await promoCodeHash(canonical)
  const grantRef = newAccessRef('GR')
  const accessToken = newAccessToken()
  // One transaction: the conditional claim succeeds for exactly one request, and the grant is inserted
  // only for the claim that wrote this request's grant id. promo_code_id is UNIQUE as a second guard.
  const [claim] = await db.batch([
    db
      .prepare(
        `UPDATE promo_codes SET redeemed_at = ?1, redeemed_email = ?2, grant_id = ?3
         WHERE code_hash = ?4 AND mode = ?5 AND redeemed_at IS NULL AND revoked_at IS NULL
           AND (expires_at IS NULL OR expires_at > ?1) AND (bound_email IS NULL OR bound_email = ?2)`,
      )
      .bind(nowIso, email, grantRef, codeHash, mode),
    db
      .prepare(
        `INSERT INTO access_grants (id, product_id, source, mode, access_token_hash, promo_code_id, created_at, updated_at)
         SELECT ?1, 'invoice-pack', 'promo_grant', mode, ?2, id, ?3, ?3 FROM promo_codes WHERE grant_id = ?1`,
      )
      .bind(grantRef, await sha256Hex(accessToken), nowIso),
  ])

  const row = await db.prepare('SELECT * FROM promo_codes WHERE code_hash = ?').bind(codeHash).first<PromoCodeRow>()
  if (!claim.meta.changes || !row || row.grant_id !== grantRef) {
    if (row) await logAccessEvent(db, 'promo_code', row.id, 'redeem_rejected', 'holder', await rejectionReason(row, email, mode, nowIso), nowIso)
    throw invalidCode()
  }
  await logAccessEvent(db, 'promo_code', row.id, 'redeemed', 'holder', [grantRef, email].filter(Boolean).join(' · '), nowIso)
  return grantResponse(grantRef, accessToken, 'promo_grant', deps)
}

// ---- Admin pass: one free Invoice Pack purchase per call ------------------------------------------

export async function claimAdminGrant(request: Request, deps: Deps): Promise<Response> {
  const db = deps.env.DB
  const mode = currentMode(deps.env)
  const body = await readJsonObject(request)
  rejectUnknownFields(body, ['passToken'])
  if (typeof body.passToken !== 'string' || !ACCESS_TOKEN_PATTERN.test(body.passToken)) throw invalidPass()
  const pass = await db.prepare('SELECT * FROM admin_passes WHERE token_hash = ?').bind(await sha256Hex(body.passToken)).first<AdminPassRow>()
  if (!pass || pass.revoked_at || pass.mode !== mode) throw invalidPass()

  const nowIso = deps.now().toISOString()
  const grantRef = newAccessRef('GR')
  const accessToken = newAccessToken()
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT INTO access_grants (id, product_id, source, mode, access_token_hash, admin_pass_id, created_at, updated_at)
         SELECT ?1, 'invoice-pack', 'admin_grant', mode, ?2, id, ?3, ?3 FROM admin_passes WHERE id = ?4 AND revoked_at IS NULL AND mode = ?5`,
      )
      .bind(grantRef, await sha256Hex(accessToken), nowIso, pass.id, mode),
    db.prepare('UPDATE admin_passes SET last_used_at = ?1 WHERE id = ?2 AND revoked_at IS NULL').bind(nowIso, pass.id),
  ])
  if (!inserted.meta.changes) throw invalidPass()
  await logAccessEvent(db, 'admin_pass', pass.id, 'grant_issued', 'holder', grantRef, nowIso)
  return grantResponse(grantRef, accessToken, 'admin_grant', deps)
}

// ---- Public: grant status (mirrors the order status endpoint) -------------------------------------

export async function getGrantStatus(ref: string, deps: Deps): Promise<Response> {
  const notFound = () => new HttpError(404, 'grant_not_found', 'We could not find that free access.')
  if (!GRANT_REF_PATTERN.test(ref)) throw notFound()
  const grant = await deps.env.DB.prepare('SELECT id, source, mode, product_id, created_at FROM access_grants WHERE id = ?')
    .bind(ref)
    .first<{ id: string; source: string; mode: Mode; product_id: string; created_at: string }>()
  if (!grant || grant.mode !== currentMode(deps.env)) throw notFound()
  return json({ grantRef: grant.id, productId: grant.product_id, source: grant.source, status: 'active', grantedAt: grant.created_at }, 200, deps.headers)
}
