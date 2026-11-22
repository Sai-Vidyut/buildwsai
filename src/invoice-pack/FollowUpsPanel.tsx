import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { copyText } from './copy'
import { formatLong, inr, type Invoice } from './logic'
import { EASE_OUT } from './motion-tokens'
import {
  createFollowup,
  findPaidOrder,
  forgetFollowup,
  getHealth,
  heldFollowups,
  manageFollowup,
  PAYMENT_CONFIRMED_EVENT,
  PaymentsApiError,
  rememberFollowup,
  type Followup,
  type FollowupAction,
  type FollowupReminder,
  type HeldFollowup,
  type HeldOrder,
  type ReminderStatus,
} from './payments-api'
import {
  DEFAULT_SECOND_DELAY,
  DEFAULT_TEMPLATES,
  DEFAULT_THIRD_DELAY,
  delayErrors,
  formatIst,
  isEmail,
  isHttpsUrl,
  MAX_SECOND_DELAY,
  MAX_THIRD_DELAY,
  normalizePhone,
  paymentInstructions,
  PLACEHOLDERS,
  reminderSchedule,
  renderSubject,
  renderTemplate,
  STAGE_LABELS,
  STAGES,
  templateErrors,
  type ReminderStage,
  type ReminderTemplate,
  type TemplateValues,
} from './reminders'
import { scrollToSection } from './scroll-to'

type ApiError = { message: string; details: string[] }

type State =
  | { name: 'checking' }
  | { name: 'locked' }
  | { name: 'unavailable' }
  | { name: 'setup'; order: HeldOrder }
  | { name: 'manage'; held: HeldFollowup; followup: Followup }

function toApiError(error: unknown): ApiError {
  if (error instanceof PaymentsApiError) return { message: error.message, details: error.details }
  return { message: 'Something went wrong. Please try again.', details: [] }
}

function ist(iso: string): string {
  return `${formatIst(iso)} IST`
}

function mailtoHref(to: string | null, subject: string, body: string): string {
  return `mailto:${to ? encodeURIComponent(to) : ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const STATUS_LABEL: Record<ReminderStatus, string> = {
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
  paused: 'Paused',
}

function statusLabel(reminder: FollowupReminder, delivery: Followup['delivery']): string {
  if (reminder.status === 'sending') return 'Sending now'
  if (reminder.status === 'sent') return reminder.sentVia === 'manual' ? 'Sent by you' : 'Sent by email'
  if (delivery === 'manual' && (reminder.status === 'scheduled' || reminder.status === 'paused')) return 'Draft · not sent'
  return STATUS_LABEL[reminder.status]
}

const EVENT_LABEL: Record<string, string> = {
  created: 'Follow-ups set up',
  paused: 'Reminders paused',
  resumed: 'Reminders resumed',
  rescheduled: 'Schedule changed',
  edited: 'Message edited',
  contact_updated: 'Contact details updated',
  marked_paid: 'You marked the invoice paid',
  sent: 'Email sent',
  sent_manually: 'You marked it sent',
  retry_requested: 'Retry requested',
  retry_scheduled: 'Send failed, will retry',
  failed: 'Send failed',
  interrupted: 'Send interrupted',
  skipped: 'Skipped',
  contact_removed: 'Client contact details removed',
}

function Notice({ tone, children }: { tone: 'info' | 'warn' | 'err'; children: ReactNode }) {
  return (
    <div className={`ip-rzp-status ip-rzp-status--${tone}`} role={tone === 'err' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

function ErrorNotice({ error }: { error: ApiError | null }) {
  if (!error) return null
  return (
    <Notice tone="err">
      <p>{error.message}</p>
      {error.details.length ? (
        <ul>
          {error.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </Notice>
  )
}

function Timeline({ items }: { items: { stage: ReminderStage; at: string; status?: string; tone?: string }[] }) {
  return (
    <ol className="ip-fu-timeline">
      {items.map((item) => (
        <li key={item.stage} className={item.tone ? `ip-fu-step ip-fu-step--${item.tone}` : 'ip-fu-step'}>
          <span className="ip-fu-dot" aria-hidden="true" />
          <span className="ip-fu-step-k">
            Reminder {item.stage} · {STAGE_LABELS[item.stage]}
          </span>
          <span className="ip-fu-step-v">{ist(item.at)}</span>
          {item.status ? <span className="ip-fu-step-s">{item.status}</span> : null}
        </li>
      ))}
    </ol>
  )
}

function DelayFields({
  second,
  third,
  onChange,
}: {
  second: string
  third: string
  onChange: (second: string, third: string) => void
}) {
  const id = useId()
  return (
    <div className="ip-row">
      <div className="ip-field">
        <label htmlFor={`${id}-s`}>Reminder 2, days after the invoice</label>
        <input
          id={`${id}-s`}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_SECOND_DELAY}
          step={1}
          value={second}
          onChange={(event) => onChange(event.target.value, third)}
        />
      </div>
      <div className="ip-field">
        <label htmlFor={`${id}-t`}>Reminder 3, days after the invoice</label>
        <input
          id={`${id}-t`}
          type="number"
          inputMode="numeric"
          min={2}
          max={MAX_THIRD_DELAY}
          step={1}
          value={third}
          onChange={(event) => onChange(second, event.target.value)}
        />
      </div>
    </div>
  )
}

function TemplateEditor({
  stage,
  template,
  values,
  onChange,
}: {
  stage: ReminderStage
  template: ReminderTemplate
  values: TemplateValues
  onChange: (template: ReminderTemplate) => void
}) {
  const id = useId()
  return (
    <div className="ip-fu-editor">
      <div className="ip-field">
        <label htmlFor={`${id}-subject`}>Reminder {stage} subject</label>
        <input id={`${id}-subject`} maxLength={150} value={template.subject} onChange={(e) => onChange({ ...template, subject: e.target.value })} />
      </div>
      <div className="ip-field">
        <label htmlFor={`${id}-body`}>Reminder {stage} message</label>
        <textarea id={`${id}-body`} rows={9} maxLength={4000} value={template.body} onChange={(e) => onChange({ ...template, body: e.target.value })} />
      </div>
      <p className="ip-hint">
        Placeholders: {PLACEHOLDERS.map((item) => `{${item.key}}`).join(' ')}. A line whose placeholder is empty is left out.
      </p>
      <div className="ip-fu-preview" aria-label={`Preview of reminder ${stage}`}>
        <p className="ip-fu-preview-subject">{renderSubject(template.subject, values)}</p>
        <pre className="ip-msg">{renderTemplate(template.body, values)}</pre>
      </div>
    </div>
  )
}

function CopyButton({ text, label = 'Copy message' }: { text: string; label?: string }) {
  const [shown, setShown] = useState(label)
  return (
    <button
      type="button"
      className="secondary"
      onClick={() => void copyText(text).then((ok) => setShown(ok ? 'Copied' : 'Select the text and copy it'))}
    >
      {shown}
    </button>
  )
}

function invoiceValues(invoice: Invoice, invoiceLink: string): TemplateValues {
  return {
    business_name: invoice.supplierName,
    client_name: invoice.clientName,
    invoice_number: invoice.invoiceNumber,
    amount: inr(invoice.balance),
    due_date: formatLong(invoice.dueDate),
    payment_instructions: paymentInstructions(invoice),
    invoice_link: isHttpsUrl(invoiceLink) ? invoiceLink : '',
  }
}

function followupValues(followup: Followup): TemplateValues {
  return {
    business_name: followup.businessName,
    client_name: followup.clientName,
    invoice_number: followup.invoiceNumber,
    amount: inr(followup.amount / 100),
    due_date: formatLong(followup.dueDate),
    payment_instructions: followup.paymentInstructions ?? '',
    invoice_link: followup.invoiceLink ?? '',
  }
}

function SetupForm({
  order,
  invoice,
  getInput,
  emailDelivery,
  onCreated,
}: {
  order: HeldOrder
  invoice: Invoice
  getInput: () => unknown
  emailDelivery: boolean
  onCreated: (held: HeldFollowup, followup: Followup) => void
}) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [link, setLink] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [second, setSecond] = useState(String(DEFAULT_SECOND_DELAY))
  const [third, setThird] = useState(String(DEFAULT_THIRD_DELAY))
  const [templates, setTemplates] = useState<Record<ReminderStage, ReminderTemplate>>(DEFAULT_TEMPLATES)
  const [editing, setEditing] = useState<ReminderStage | null>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const values = invoiceValues(invoice, link)
  const delayProblems = delayErrors(second, third)
  const schedule = delayProblems.length ? null : reminderSchedule(invoice.invoiceDate, Number(second), Number(third))

  function localErrors(): string[] {
    const errors = [...delayProblems]
    if (enabled && !email.trim()) errors.push('Automatic reminders need the client’s email address.')
    if (email.trim() && !isEmail(email.trim())) errors.push('Enter a valid client email address.')
    if (phone.trim() && !normalizePhone(phone)) errors.push('Enter the client phone number with digits only, for example +91 98765 43210.')
    if (replyTo.trim() && !isEmail(replyTo.trim())) errors.push('Enter a valid email address for client replies.')
    if (email.trim() && !replyTo.trim()) errors.push('Add your email address so your client’s replies reach you.')
    if (link.trim() && !isHttpsUrl(link.trim())) errors.push('The invoice link must be an https:// address.')
    for (const stage of STAGES) errors.push(...templateErrors(templates[stage]).map((problem) => `Reminder ${stage}: ${problem}`))
    if (!consent) errors.push('Confirm that your client expects to hear from you about this invoice.')
    return errors
  }

  async function submit() {
    const problems = localErrors()
    if (problems.length) {
      setError({ message: 'Fix the follow-up details below.', details: problems })
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { followup, manageToken } = await createFollowup(order, getInput(), {
        contact: { clientEmail: email.trim(), clientPhone: phone.trim(), replyTo: replyTo.trim() },
        schedule: { enabled, secondDelayDays: Number(second), thirdDelayDays: Number(third) },
        templates: STAGES.map((stage) => templates[stage]),
        invoiceLink: link.trim(),
      })
      const held = { id: followup.id, token: manageToken, orderRef: order.ref }
      rememberFollowup(held)
      onCreated(held, followup)
    } catch (caught) {
      setError(toApiError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="ip-fu-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {emailDelivery ? (
        <Notice tone="info">
          <p>Reminders are emailed to your client at 10:00 India time on each date, with replies going to the address you give.</p>
        </Notice>
      ) : (
        <Notice tone="warn">
          <p>
            Automatic email is not set up on this site yet, so nothing is sent for you. Each reminder is kept as a draft
            on its date for you to copy or open in your email app.
          </p>
        </Notice>
      )}
      <div className="ip-row">
        <div className="ip-field">
          <label htmlFor={`${id}-email`}>Client email</label>
          <input id={`${id}-email`} type="email" autoComplete="off" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="ip-field">
          <label htmlFor={`${id}-phone`}>Client phone (optional)</label>
          <input id={`${id}-phone`} type="tel" autoComplete="off" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="ip-hint">Stored for your records. WhatsApp sending is not available yet.</p>
        </div>
      </div>
      <div className="ip-row">
        <div className="ip-field">
          <label htmlFor={`${id}-reply`}>Your email for client replies</label>
          <input
            id={`${id}-reply`}
            type="email"
            autoComplete="email"
            maxLength={254}
            aria-describedby={`${id}-reply-hint`}
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
          />
          <p className="ip-hint" id={`${id}-reply-hint`}>
            Required with a client email. When your client replies, it comes to you, not to Invoice Pack.
          </p>
        </div>
        <div className="ip-field">
          <label htmlFor={`${id}-link`}>Link to the invoice (optional)</label>
          <input id={`${id}-link`} type="url" inputMode="url" maxLength={300} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
          <p className="ip-hint">For example a shared Google Drive file. Invoice Pack does not host the invoice.</p>
        </div>
      </div>
      <label className="ip-check ip-fu-switch">
        <input type="checkbox" role="switch" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {enabled ? 'Reminders on' : 'Reminders off — keep them as drafts for now'}
      </label>
      <DelayFields
        second={second}
        third={third}
        onChange={(s, t) => {
          setSecond(s)
          setThird(t)
        }}
      />
      {schedule ? (
        <Timeline items={STAGES.map((stage) => ({ stage, at: schedule[stage] }))} />
      ) : (
        <p className="ip-err">{delayProblems[0]}</p>
      )}
      <div className="ip-fu-templates">
        {STAGES.map((stage) => (
          <section key={stage} className="ip-reminder">
            <h3>
              Reminder {stage} · {STAGE_LABELS[stage]}
            </h3>
            {editing === stage ? (
              <TemplateEditor
                stage={stage}
                template={templates[stage]}
                values={values}
                onChange={(next) => setTemplates((current) => ({ ...current, [stage]: next }))}
              />
            ) : (
              <>
                <p className="ip-fu-preview-subject">{renderSubject(templates[stage].subject, values)}</p>
                <pre className="ip-msg">{renderTemplate(templates[stage].body, values)}</pre>
              </>
            )}
            <div className="ip-actions">
              <button type="button" className="secondary" aria-expanded={editing === stage} onClick={() => setEditing(editing === stage ? null : stage)}>
                {editing === stage ? 'Done editing' : 'Edit message'}
              </button>
              {editing === stage ? (
                <button type="button" className="secondary" onClick={() => setTemplates((current) => ({ ...current, [stage]: DEFAULT_TEMPLATES[stage] }))}>
                  Reset to default
                </button>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      <label className="ip-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        My client expects to hear from me about this invoice, and I may use their contact details for these reminders.
      </label>
      <p className="ip-hint">
        Client contact details are kept only for these reminders, and removed once nothing has happened on this
        follow-up for 90 days (paused follow-ups included).
      </p>
      <ErrorNotice error={error} />
      <div className="ip-actions">
        <button type="submit" className="ip-btn" disabled={busy} aria-busy={busy}>
          {busy ? <span className="ip-spinner" aria-hidden="true" /> : null}
          {busy ? 'Saving…' : 'Set up follow-ups'}
        </button>
      </div>
    </form>
  )
}

function ReminderCard({
  reminder,
  followup,
  run,
  busy,
}: {
  reminder: FollowupReminder
  followup: Followup
  run: (action: FollowupAction) => Promise<boolean>
  busy: boolean
}) {
  const [editing, setEditing] = useState<ReminderTemplate | null>(null)
  const [renderedAt] = useState(() => Date.now())
  const open = reminder.status === 'scheduled' || reminder.status === 'paused' || reminder.status === 'failed'
  const unpaid = followup.paymentStatus === 'unpaid'
  const due = new Date(reminder.dueAt).getTime() <= renderedAt
  const { subject, body } = reminder.rendered
  const tone = reminder.status === 'sent' ? 'ok' : reminder.status === 'failed' ? 'err' : reminder.status === 'cancelled' ? 'muted' : undefined

  return (
    <section className="ip-reminder ip-fu-reminder" data-testid={`followup-reminder-${reminder.stage}`}>
      <div className="ip-fu-reminder-head">
        <h3>
          Reminder {reminder.stage} · {STAGE_LABELS[reminder.stage]}
        </h3>
        <span className={tone ? `ip-fu-badge ip-fu-badge--${tone}` : 'ip-fu-badge'}>{statusLabel(reminder, followup.delivery)}</span>
      </div>
      <p className="ip-fu-meta">
        {reminder.status === 'sent' && reminder.sentAt ? `Sent ${ist(reminder.sentAt)}` : `Due ${ist(reminder.dueAt)}`}
        {reminder.status === 'scheduled' && reminder.attempts > 0 && reminder.nextAttemptAt !== reminder.dueAt
          ? ` · next try ${ist(reminder.nextAttemptAt)}`
          : ''}
      </p>
      {reminder.errorReason && reminder.status !== 'sent' ? <p className="ip-fu-error">{reminder.errorReason}</p> : null}
      {editing ? (
        <TemplateEditor stage={reminder.stage} template={editing} values={followupValues(followup)} onChange={setEditing} />
      ) : (
        <>
          <p className="ip-fu-preview-subject">{subject}</p>
          <pre className="ip-msg">{body}</pre>
        </>
      )}
      <div className="ip-actions">
        {editing ? (
          <>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                void run({ action: 'update_template', stage: reminder.stage, subject: editing.subject, body: editing.body }).then((ok) => {
                  if (ok) setEditing(null)
                })
              }
            >
              Save message
            </button>
            <button type="button" className="secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <CopyButton text={`Subject: ${subject}\n\n${body}`} />
            <a className="ip-btn secondary" href={mailtoHref(followup.contact.clientEmail, subject, body)}>
              Open email draft
            </a>
            {open && unpaid ? (
              <button type="button" className="secondary" onClick={() => setEditing({ subject: reminder.subject, body: reminder.body })}>
                Edit
              </button>
            ) : null}
            {open && unpaid && (due || followup.delivery === 'manual') ? (
              <button type="button" className="secondary" disabled={busy} onClick={() => void run({ action: 'mark_sent', stage: reminder.stage })}>
                I sent this myself
              </button>
            ) : null}
            {reminder.status === 'failed' && unpaid && followup.delivery === 'email' && followup.remindersEnabled ? (
              <button type="button" className="secondary" disabled={busy} onClick={() => void run({ action: 'retry', stage: reminder.stage })}>
                Retry sending
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

function ManageView({ held, followup, onChange }: { held: HeldFollowup; followup: Followup; onChange: (followup: Followup) => void }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [confirmPaid, setConfirmPaid] = useState(false)
  const [missed, setMissed] = useState<FollowupReminder[]>([])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [second, setSecond] = useState(String(followup.secondDelayDays))
  const [third, setThird] = useState(String(followup.thirdDelayDays))
  const [email, setEmail] = useState(followup.contact.clientEmail ?? '')
  const [phone, setPhone] = useState(followup.contact.clientPhone ?? '')
  const [replyTo, setReplyTo] = useState(followup.contact.replyTo ?? '')
  const unpaid = followup.paymentStatus === 'unpaid'

  const run = useCallback(
    async (action: FollowupAction) => {
      setBusy(true)
      setError(null)
      try {
        const { followup: next } = await manageFollowup(held, action)
        onChange(next)
        return true
      } catch (caught) {
        setError(toApiError(caught))
        return false
      } finally {
        setBusy(false)
      }
    },
    [held, onChange],
  )

  return (
    <div className="ip-fu-manage" data-testid="followups-manage">
      <div className="ip-fu-summary">
        <p>
          <span>Invoice</span>
          <strong>{followup.invoiceNumber}</strong>
        </p>
        <p>
          <span>Client</span>
          <strong>{followup.clientName}</strong>
        </p>
        <p>
          <span>Amount</span>
          <strong>{inr(followup.amount / 100)}</strong>
        </p>
        <p>
          <span>Client payment</span>
          <strong className={unpaid ? '' : 'ip-fu-paid'}>{unpaid ? 'Not yet confirmed' : 'Paid (your confirmation)'}</strong>
        </p>
      </div>

      {followup.delivery === 'manual' && unpaid ? (
        <Notice tone="warn">
          <p>Automatic email is not set up on this site, so nothing is sent for you. Send each draft yourself, then mark it sent.</p>
        </Notice>
      ) : null}
      {!unpaid && followup.paidAt ? (
        <Notice tone="info">
          <p>You marked this invoice paid on {ist(followup.paidAt)}. Remaining reminders were cancelled.</p>
        </Notice>
      ) : null}
      {followup.contactPurged ? (
        <Notice tone="info">
          <p>Client contact details were removed after 90 days without activity, and the remaining reminders were closed.</p>
        </Notice>
      ) : null}

      <Timeline
        items={followup.reminders.map((reminder) => ({
          stage: reminder.stage,
          at: reminder.sentAt ?? reminder.dueAt,
          status: statusLabel(reminder, followup.delivery),
          tone: reminder.status === 'sent' ? 'ok' : reminder.status === 'failed' ? 'err' : reminder.status === 'cancelled' ? 'muted' : undefined,
        }))}
      />

      {unpaid ? (
        <div className="ip-actions ip-fu-controls">
          <label className="ip-check ip-fu-switch">
            <input
              type="checkbox"
              role="switch"
              checked={followup.remindersEnabled}
              disabled={busy}
              onChange={(event) => {
                if (!event.target.checked) {
                  setMissed([])
                  void run({ action: 'pause' })
                  return
                }
                const passed = followup.reminders.filter((r) => r.status === 'paused' && new Date(r.dueAt).getTime() <= Date.now())
                if (passed.length) setMissed(passed)
                else void run({ action: 'resume' })
              }}
            />
            {followup.remindersEnabled ? 'Reminders on' : 'Reminders paused'}
          </label>
          <button type="button" className="secondary" aria-expanded={scheduleOpen} onClick={() => setScheduleOpen(!scheduleOpen)}>
            Change schedule
          </button>
          <button type="button" className="secondary" aria-expanded={contactOpen} onClick={() => setContactOpen(!contactOpen)}>
            Edit contact
          </button>
          <button type="button" className="secondary" aria-expanded={confirmPaid} onClick={() => setConfirmPaid(!confirmPaid)}>
            Mark invoice paid
          </button>
        </div>
      ) : null}

      {missed.length > 0 && unpaid && !followup.remindersEnabled ? (
        <div className="ip-fu-inline ip-fu-confirm" role="group" aria-label="Missed reminders" data-testid="followups-resume-choice">
          <p>
            {missed.length === 1
              ? `Reminder ${missed[0].stage}'s date passed while reminders were paused.`
              : `The dates for reminders ${missed.map((r) => r.stage).join(' and ')} passed while reminders were paused.`}{' '}
            Missed reminders are skipped unless you choose to send the latest one now. Later reminders keep their dates.
          </p>
          <div className="ip-actions">
            <button type="button" className="ip-btn" disabled={busy} onClick={() => void run({ action: 'resume' }).then((ok) => ok && setMissed([]))}>
              Resume and skip missed
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void run({ action: 'resume', sendMissed: true }).then((ok) => ok && setMissed([]))}
            >
              Resume and send reminder {missed[missed.length - 1].stage} now
            </button>
            <button type="button" className="secondary" onClick={() => setMissed([])}>
              Stay paused
            </button>
          </div>
        </div>
      ) : null}

      {followup.reminders.some((r) => r.status === 'sending') ? (
        <Notice tone="info">
          <p>A reminder is being sent right now. Once the email provider has accepted it, it cannot be recalled; pausing or marking paid applies to the remaining reminders.</p>
        </Notice>
      ) : null}

      {scheduleOpen && unpaid ? (
        <form
          className="ip-fu-inline"
          onSubmit={(event) => {
            event.preventDefault()
            void run({ action: 'reschedule', secondDelayDays: Number(second), thirdDelayDays: Number(third) }).then((ok) => ok && setScheduleOpen(false))
          }}
        >
          <DelayFields
            second={second}
            third={third}
            onChange={(s, t) => {
              setSecond(s)
              setThird(t)
            }}
          />
          <p className="ip-hint">
            Reminders already sent are not moved. Times are 10:00 India time. If a new date has already passed, that
            reminder is sent at the next run (only the latest one, if several have passed).
          </p>
          <button type="submit" className="secondary" disabled={busy}>
            Save schedule
          </button>
        </form>
      ) : null}

      {contactOpen && unpaid ? (
        <form
          className="ip-fu-inline"
          onSubmit={(event) => {
            event.preventDefault()
            void run({
              action: 'update_contact',
              contact: { clientEmail: email.trim(), clientPhone: phone.trim(), replyTo: replyTo.trim() },
              invoiceLink: followup.invoiceLink ?? undefined,
            }).then((ok) => ok && setContactOpen(false))
          }}
        >
          <div className="ip-row">
            <div className="ip-field">
              <label htmlFor={`${id}-email`}>Client email</label>
              <input id={`${id}-email`} type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="ip-field">
              <label htmlFor={`${id}-phone`}>Client phone (optional)</label>
              <input id={`${id}-phone`} type="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="ip-field">
            <label htmlFor={`${id}-reply`}>Your email for client replies</label>
            <input id={`${id}-reply`} type="email" maxLength={254} value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
            <p className="ip-hint">Your client’s replies come to this address.</p>
          </div>
          <button type="submit" className="secondary" disabled={busy}>
            Save contact
          </button>
        </form>
      ) : null}

      {confirmPaid && unpaid ? (
        <div className="ip-fu-inline ip-fu-confirm" role="group" aria-label="Confirm the client has paid">
          <p>
            This records your own confirmation that {followup.clientName} paid invoice {followup.invoiceNumber}. Invoice Pack
            cannot see your bank or UPI account, and your Invoice Pack purchase is not the client’s payment. Remaining
            reminders will be cancelled.
          </p>
          <div className="ip-actions">
            <button type="button" className="ip-btn" disabled={busy} onClick={() => void run({ action: 'mark_paid' }).then(() => setConfirmPaid(false))}>
              Yes, the client has paid
            </button>
            <button type="button" className="secondary" onClick={() => setConfirmPaid(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <ErrorNotice error={error} />

      <div className="ip-fu-reminders">
        {followup.reminders.map((reminder) => (
          <ReminderCard key={reminder.stage} reminder={reminder} followup={followup} run={run} busy={busy} />
        ))}
      </div>

      <details className="ip-fu-history">
        <summary>History</summary>
        {followup.history.length ? (
          <ol>
            {followup.history.map((event, index) => (
              <li key={`${event.at}-${index}`}>
                <time dateTime={event.at}>{ist(event.at)}</time>
                <span>
                  {event.stage ? `Reminder ${event.stage}: ` : ''}
                  {EVENT_LABEL[event.event] ?? event.event}
                  {event.detail && event.event !== 'created' ? ` — ${event.detail}` : ''}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="ip-hint">Nothing yet.</p>
        )}
      </details>
    </div>
  )
}

export function FollowUpsPanel({ invoice, getInput }: { invoice: Invoice; getInput: () => unknown }) {
  const reduce = useReducedMotion()
  const [state, setState] = useState<State>({ name: 'checking' })
  const [emailDelivery, setEmailDelivery] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    void getHealth()
      .then((health) => active && setEmailDelivery(Boolean(health.emailDelivery)))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      const order = await findPaidOrder('invoice-pack')
      if (!order) return { name: 'locked' } as State
      const held = heldFollowups().find((item) => item.orderRef === order.ref)
      if (held) {
        try {
          const { followup } = await manageFollowup(held, { action: 'view' })
          return { name: 'manage', held, followup } as State
        } catch (error) {
          if (!(error instanceof PaymentsApiError && error.status === 403)) throw error
          forgetFollowup(held.id)
        }
      }
      return { name: 'setup', order } as State
    })()
      .then((next) => active && setState(next))
      .catch(() => active && setState({ name: 'unavailable' }))
    return () => {
      active = false
    }
  }, [nonce])

  useEffect(() => {
    const onPaid = (event: Event) => {
      if ((event as CustomEvent<{ productId?: string }>).detail?.productId === 'invoice-pack') setNonce((n) => n + 1)
    }
    window.addEventListener(PAYMENT_CONFIRMED_EVENT, onPaid)
    return () => window.removeEventListener(PAYMENT_CONFIRMED_EVENT, onPaid)
  }, [])

  const preview = reminderSchedule(invoice.invoiceDate, DEFAULT_SECOND_DELAY, DEFAULT_THIRD_DELAY)
  const onManageChange = useCallback(
    (followup: Followup) => setState((current) => (current.name === 'manage' ? { ...current, followup } : current)),
    [],
  )

  return (
    <section className="ip-reminders-block ip-fu" aria-labelledby="followups-heading" data-testid="followups-panel">
      <h3 id="followups-heading">Payment follow-ups</h3>
      <p className="ip-fine">
        Three reminders to your client about this invoice. They are separate from your Invoice Pack payment and never mark
        the client’s invoice paid on their own.
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.name}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
          aria-live="polite"
        >
          {state.name === 'checking' ? (
            <p className="ip-export-note">
              <span className="ip-spinner" aria-hidden="true" /> Checking for a paid order in this browser…
            </p>
          ) : null}

          {state.name === 'unavailable' ? (
            <Notice tone="warn">
              <p>We could not load your follow-ups right now. Check your connection, then try again.</p>
              <button type="button" className="ip-plain ip-rzp-link" onClick={() => setNonce((n) => n + 1)}>
                Try again
              </button>
            </Notice>
          ) : null}

          {state.name === 'locked' ? (
            <div className="ip-fu-locked" data-testid="followups-locked">
              <Timeline items={STAGES.map((stage) => ({ stage, at: preview[stage] }))} />
              <p className="ip-export-note">
                Messages, scheduling and email reminders unlock with your Invoice Pack payment.
              </p>
              <button type="button" className="ip-btn" onClick={() => scrollToSection('pay-499')}>
                Pay ₹499 to unlock
                <span className="ip-btn-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          ) : null}

          {state.name === 'setup' ? (
            <SetupForm
              order={state.order}
              invoice={invoice}
              getInput={getInput}
              emailDelivery={emailDelivery}
              onCreated={(held, followup) => setState({ name: 'manage', held, followup })}
            />
          ) : null}

          {state.name === 'manage' ? <ManageView held={state.held} followup={state.followup} onChange={onManageChange} /> : null}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
