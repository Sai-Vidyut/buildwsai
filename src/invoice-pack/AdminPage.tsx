import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { copyText } from './copy'
import { EASE_OUT } from './motion-tokens'
import {
  adminRequest,
  forgetAdminPass,
  heldAdminPass,
  onlinePaymentsEnabled,
  PaymentsApiError,
  rememberAdminPass,
  type AdminAction,
  type AdminOverview,
  type AdminPromoCode,
} from './payments-api'

const STATUS_LABEL: Record<AdminPromoCode['status'], string> = {
  unused: 'Unused',
  redeemed: 'Redeemed',
  expired: 'Expired',
  revoked: 'Revoked',
}

const STATUS_TONE: Record<AdminPromoCode['status'], string> = {
  unused: 'ip-fu-badge',
  redeemed: 'ip-fu-badge ip-fu-badge--ok',
  expired: 'ip-fu-badge ip-fu-badge--muted',
  revoked: 'ip-fu-badge ip-fu-badge--err',
}

const EVENT_LABEL: Record<string, string> = {
  created: 'Created',
  redeemed: 'Redeemed',
  redeem_rejected: 'Redemption refused',
  expired: 'Expired',
  revoked: 'Revoked',
  grant_issued: 'Free invoice unlocked',
}

function formatIst(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : `${date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST`
}

function messageOf(error: unknown): string {
  return error instanceof PaymentsApiError ? error.message : 'Something went wrong. Please try again.'
}

function deviceLabel(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const platform = nav.userAgentData?.platform || nav.platform || 'browser'
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  return `${platform} · added ${date}`.slice(0, 40)
}

function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

// Owner-only page at /invoice-pack#admin. Every action is authorized by the Worker with the admin key;
// the key lives only in this component's memory and is gone when the tab closes or you sign out.
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)

  if (!onlinePaymentsEnabled()) {
    return (
      <AdminFrame>
        <p className="ip-rzp-status ip-rzp-status--warn">The payments server is not configured for this site, so admin is unavailable.</p>
      </AdminFrame>
    )
  }

  if (!adminKey || !overview) {
    return (
      <AdminFrame>
        <SignIn
          onSignedIn={(key, data) => {
            setAdminKey(key)
            setOverview(data)
          }}
        />
      </AdminFrame>
    )
  }

  return (
    <AdminFrame
      onSignOut={() => {
        setAdminKey(null)
        setOverview(null)
      }}
    >
      <Dashboard adminKey={adminKey} overview={overview} onChange={setOverview} onSignedOut={() => setAdminKey(null)} />
    </AdminFrame>
  )
}

function AdminFrame({ children, onSignOut }: { children: ReactNode; onSignOut?: () => void }) {
  return (
    <section className="ip-section ip-admin" aria-labelledby="admin-heading" data-testid="admin-page">
      <div className="ip-wrap">
        <div className="ip-admin-head">
          <div>
            <p className="ip-eyebrow">Owner only</p>
            <h1 id="admin-heading" className="ip-admin-title">
              Invoice Pack admin
            </h1>
          </div>
          <div className="ip-actions">
            <a className="secondary ip-admin-link" href="/invoice-pack">
              Back to Invoice Pack
            </a>
            {onSignOut ? (
              <button type="button" className="secondary" onClick={onSignOut}>
                Sign out
              </button>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

function SignIn({ onSignedIn }: { onSignedIn: (key: string, overview: AdminOverview) => void }) {
  const id = useId()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const data = await adminRequest(key.trim(), { action: 'overview' })
      onSignedIn(key.trim(), data)
    } catch (err) {
      setError(err instanceof PaymentsApiError && (err.status === 401 || err.status === 404) ? 'That admin key is not valid.' : messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ip-admin-card ip-admin-signin" onSubmit={(event) => void submit(event)}>
      <h2>Sign in</h2>
      <p className="ip-fine">
        Enter your admin key. It is checked by the payments server, kept only in this tab’s memory, and never saved in the browser.
      </p>
      <div className="ip-field">
        <label htmlFor={`${id}-key`}>Admin key</label>
        <input
          id={`${id}-key`}
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={256}
          data-testid="admin-key"
        />
      </div>
      {error ? (
        <p className="ip-rzp-status ip-rzp-status--err" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ip-actions">
        <button type="submit" className="ip-btn" disabled={busy || key.trim().length < 32} aria-busy={busy}>
          {busy ? <span className="ip-spinner" aria-hidden="true" /> : null}
          Continue
        </button>
      </div>
    </form>
  )
}

function Dashboard({
  adminKey,
  overview,
  onChange,
  onSignedOut,
}: {
  adminKey: string
  overview: AdminOverview
  onChange: (overview: AdminOverview) => void
  onSignedOut: () => void
}) {
  const id = useId()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [held, setHeld] = useState(heldAdminPass)
  const [email, setEmail] = useState('')
  const [expiry, setExpiry] = useState('')
  const [note, setNote] = useState('')
  const [created, setCreated] = useState<{ code: string; copied: boolean } | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  async function run<T>(label: string, action: AdminAction, then: (result: T) => void | Promise<void>) {
    if (busy) return
    setBusy(label)
    setError('')
    try {
      await then(await adminRequest<T>(adminKey, action))
    } catch (err) {
      if (err instanceof PaymentsApiError && err.status === 401) onSignedOut()
      setError(messageOf(err))
    } finally {
      setBusy(null)
    }
  }

  const refresh = () => adminRequest(adminKey, { action: 'overview' }).then(onChange)
  const thisPass = held ? overview.adminPasses.find((p) => p.id === held.id) : undefined

  function generate(event: FormEvent) {
    event.preventDefault()
    void run<{ code: string }>(
      'create',
      { action: 'create_code', email: email.trim() || undefined, expiresAt: expiry || undefined, note: note.trim() || undefined },
      async (result) => {
        setCreated({ code: result.code, copied: false })
        setEmail('')
        setExpiry('')
        setNote('')
        await refresh()
      },
    )
  }

  return (
    <div className="ip-admin-grid">
      {error ? (
        <p className="ip-rzp-status ip-rzp-status--err ip-admin-wide" role="alert">
          {error}
        </p>
      ) : null}

      <div className="ip-admin-card" data-testid="admin-entitlement">
        <h2>My admin access</h2>
        <p className="ip-fine">
          Mode: <strong>{overview.mode === 'live' ? 'Live' : 'Test'}</strong>. Admin access lets a browser unlock Invoice Pack invoices for
          free. It never records a Razorpay payment.
        </p>
        {thisPass?.status === 'active' ? (
          <p className="ip-admin-status">
            <span className="ip-fu-badge ip-fu-badge--ok">Active</span> This browser has permanent admin access ({thisPass.label}).
          </p>
        ) : (
          <>
            <p className="ip-admin-status">
              <span className="ip-fu-badge ip-fu-badge--muted">Not set up</span>{' '}
              {held ? 'The admin pass saved in this browser is no longer valid.' : 'This browser does not have admin access yet.'}
            </p>
            <button
              type="button"
              className="ip-btn"
              disabled={busy !== null}
              aria-busy={busy === 'pass'}
              data-testid="admin-enable-browser"
              onClick={() =>
                void run<{ passId: string; passToken: string }>('pass', { action: 'create_admin_pass', label: deviceLabel() }, async (result) => {
                  rememberAdminPass({ id: result.passId, token: result.passToken })
                  setHeld({ id: result.passId, token: result.passToken })
                  await refresh()
                })
              }
            >
              Turn on admin access in this browser
            </button>
          </>
        )}
        {overview.adminPasses.length ? (
          <ul className="ip-admin-list">
            {overview.adminPasses.map((pass) => (
              <li key={pass.id}>
                <span>
                  <strong>{pass.label}</strong> · {pass.id}
                  {pass.id === held?.id ? ' · this browser' : ''}
                  <br />
                  <span className="ip-fine">
                    Created {formatIst(pass.createdAt)} · last used {formatIst(pass.lastUsedAt)}
                  </span>
                </span>
                {pass.status === 'active' ? (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy !== null}
                    onClick={() =>
                      void run('revoke-pass', { action: 'revoke_admin_pass', passId: pass.id }, (data: AdminOverview) => {
                        if (pass.id === held?.id) {
                          forgetAdminPass()
                          setHeld(null)
                        }
                        onChange(data)
                      })
                    }
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="ip-fu-badge ip-fu-badge--muted">{pass.status === 'revoked' ? 'Revoked' : 'Other mode'}</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <form className="ip-admin-card" onSubmit={generate} data-testid="admin-generate">
        <h2>Generate a promotional code</h2>
        <p className="ip-fine">One code unlocks one complete Invoice Pack (final export and follow-ups) and works only once.</p>
        <div className="ip-field">
          <label htmlFor={`${id}-email`}>Only for this email (optional)</label>
          <input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="off" />
        </div>
        <div className="ip-field">
          <label htmlFor={`${id}-expiry`}>Expires at the end of (optional, India time)</label>
          <input id={`${id}-expiry`} type="date" value={expiry} min={todayInIndia()} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <div className="ip-field">
          <label htmlFor={`${id}-note`}>Note for yourself (optional)</label>
          <input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="e.g. Priya, beta tester" />
        </div>
        <div className="ip-actions">
          <button type="submit" className="ip-btn" disabled={busy !== null} aria-busy={busy === 'create'}>
            {busy === 'create' ? <span className="ip-spinner" aria-hidden="true" /> : null}
            Generate code
          </button>
        </div>
        <AnimatePresence initial={false}>
          {created ? (
            <motion.div
              className="ip-fu-inline ip-admin-code"
              role="status"
              data-testid="admin-new-code"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              <p className="ip-fine">Copy it now. This is the only time the code is shown; the server keeps only a hash.</p>
              <code>{created.code}</code>
              <div className="ip-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void copyText(created.code).then((ok) => setCreated({ ...created, copied: ok }))}
                >
                  {created.copied ? 'Copied' : 'Copy code'}
                </button>
                <button type="button" className="ip-plain ip-rzp-link" onClick={() => setCreated(null)}>
                  Done
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </form>

      <div className="ip-admin-card ip-admin-wide" data-testid="admin-codes">
        <h2>Issued codes</h2>
        {overview.codes.length === 0 ? (
          <p className="ip-fine">No codes yet.</p>
        ) : (
          <div className="ip-admin-table-wrap">
            <table className="ip-admin-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Status</th>
                  <th scope="col">Restricted to</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Redeemed</th>
                  <th scope="col">
                    <span className="ip-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.codes.map((code) => (
                  <tr key={code.id} data-testid={`admin-code-${code.status}`}>
                    <td>
                      <strong>…{code.hint}</strong>
                      {code.note ? <span className="ip-fine"> · {code.note}</span> : null}
                      <br />
                      <span className="ip-fine">
                        {formatIst(code.createdAt)}
                        {code.mode === 'test' ? ' · test mode' : ''}
                      </span>
                    </td>
                    <td>
                      <span className={STATUS_TONE[code.status]}>{STATUS_LABEL[code.status]}</span>
                    </td>
                    <td>{code.boundEmail ?? 'Anyone'}</td>
                    <td>{code.expiresAt ? formatIst(code.expiresAt) : 'Never'}</td>
                    <td>
                      {code.redeemedAt ? (
                        <>
                          {formatIst(code.redeemedAt)}
                          <br />
                          <span className="ip-fine">{code.redeemedEmail ?? 'No email given'}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {code.status === 'unused' || code.status === 'expired' ? (
                        confirmRevoke === code.id ? (
                          <span className="ip-admin-confirm">
                            <button
                              type="button"
                              className="secondary"
                              disabled={busy !== null}
                              onClick={() =>
                                void run('revoke', { action: 'revoke_code', codeId: code.id }, (data: AdminOverview) => {
                                  setConfirmRevoke(null)
                                  onChange(data)
                                })
                              }
                            >
                              Confirm revoke
                            </button>
                            <button type="button" className="ip-plain ip-rzp-link" onClick={() => setConfirmRevoke(null)}>
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button type="button" className="secondary" disabled={busy !== null} onClick={() => setConfirmRevoke(code.id)}>
                            Revoke
                          </button>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <details className="ip-admin-card ip-admin-wide ip-fu-history">
        <summary>Audit trail</summary>
        <ul className="ip-admin-list">
          {overview.events.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <span>
                <strong>{EVENT_LABEL[event.event] ?? event.event}</strong> · {event.subjectType === 'promo_code' ? 'code' : 'admin pass'}{' '}
                {event.subjectId}
                {event.detail ? ` · ${event.detail}` : ''}
              </span>
              <span className="ip-fine">
                {formatIst(event.at)} · by {event.actor}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
