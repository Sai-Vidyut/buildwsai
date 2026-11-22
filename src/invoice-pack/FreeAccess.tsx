import { useId, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT } from './motion-tokens'
import { claimAdminGrant, forgetAdminPass, heldAdminPass, PaymentsApiError, redeemPromoCode, type IssuedGrant } from './payments-api'

type Phase = { name: 'idle' } | { name: 'busy' } | { name: 'done'; grant: IssuedGrant } | { name: 'error'; message: string }

function messageOf(error: unknown): string {
  return error instanceof PaymentsApiError ? error.message : 'Something went wrong. Please try again.'
}

// Free Invoice Pack access: an admin pass held by this browser, or a one-time promo code.
// The server decides; this component only forwards what the user holds.
export function FreeAccess() {
  const id = useId()
  const [pass, setPass] = useState(heldAdminPass)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })

  async function unlockAsAdmin() {
    if (!pass || phase.name === 'busy') return
    setPhase({ name: 'busy' })
    try {
      setPhase({ name: 'done', grant: await claimAdminGrant(pass) })
    } catch (error) {
      if (error instanceof PaymentsApiError && error.code === 'admin_pass_invalid') {
        forgetAdminPass()
        setPass(null)
      }
      setPhase({ name: 'error', message: messageOf(error) })
    }
  }

  async function redeem(event: FormEvent) {
    event.preventDefault()
    if (phase.name === 'busy') return
    if (!code.trim()) {
      setPhase({ name: 'error', message: 'Enter your access code.' })
      return
    }
    setPhase({ name: 'busy' })
    try {
      setPhase({ name: 'done', grant: await redeemPromoCode(code, email) })
      setCode('')
    } catch (error) {
      setPhase({ name: 'error', message: messageOf(error) })
    }
  }

  const busy = phase.name === 'busy'
  const status = (
    <AnimatePresence mode="wait" initial={false}>
      {phase.name === 'done' || phase.name === 'error' ? (
        <motion.div
          key={phase.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {phase.name === 'done' ? (
            <div className="ip-rzp-status ip-rzp-status--info" role="status" data-testid="free-access-done">
              <p>
                Unlocked as <strong>{phase.grant.grantRef}</strong>. This browser can now export one final invoice and set up
                its payment follow-ups.{' '}
                <a href="#create" className="ip-rzp-export-link">
                  Go to your invoice
                </a>
              </p>
            </div>
          ) : (
            <p className="ip-rzp-status ip-rzp-status--err" role="alert">
              {phase.message}
            </p>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (pass) {
    return (
      <div className="ip-free" data-testid="free-access-admin">
        <p className="ip-free-title">
          <span className="ip-fu-badge ip-fu-badge--ok">Admin</span> This browser has permanent admin access.
        </p>
        <p className="ip-fine">Each unlock covers one invoice, its final export and its follow-ups. No payment is recorded.</p>
        <button type="button" className="ip-btn" onClick={() => void unlockAsAdmin()} disabled={busy} aria-busy={busy}>
          {busy ? <span className="ip-spinner" aria-hidden="true" /> : null}
          Unlock this invoice with admin access
        </button>
        {status}
      </div>
    )
  }

  return (
    <div className="ip-free" data-testid="free-access-code">
      <button
        type="button"
        className="ip-plain ip-rzp-link"
        aria-expanded={open}
        aria-controls={`${id}-form`}
        onClick={() => setOpen((value) => !value)}
      >
        Have an access code?
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.form
            id={`${id}-form`}
            className="ip-free-form"
            onSubmit={(event) => void redeem(event)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            noValidate
          >
            <div className="ip-field">
              <label htmlFor={`${id}-code`}>Access code</label>
              <input
                id={`${id}-code`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="IPC-XXXXX-XXXXX-XXXXX-XXXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={64}
              />
            </div>
            <div className="ip-field">
              <label htmlFor={`${id}-email`}>Your email (if the code was issued to you)</label>
              <input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} />
            </div>
            <p className="ip-fine">A code works once and unlocks one full Invoice Pack: the final invoice export and its follow-ups.</p>
            <button type="submit" className="ip-btn" disabled={busy} aria-busy={busy} data-testid="free-access-redeem">
              {busy ? <span className="ip-spinner" aria-hidden="true" /> : null}
              Redeem code
            </button>
          </motion.form>
        ) : null}
      </AnimatePresence>
      {status}
    </div>
  )
}
