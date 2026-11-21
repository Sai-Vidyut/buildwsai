import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { buildPack, clean, emptyPack, inr, todayKolkata, type Invoice, type PackInput } from './logic'
import { CountUp, Reveal } from './motion-kit'
import { EASE_OUT } from './motion-tokens'
import { PaperPreview } from './PaperPreview'
import { StateSelect } from './StateSelect'
import { ExportPanel } from './ExportPanel'
import { onlinePaymentsEnabled } from './payments-api'
import { Errors, InvoiceSheet, Reminders, Warnings } from './Sheets'

const PROTECTED_EXPORTS = onlinePaymentsEnabled()

const STEPS = [
  { id: 'seller', title: 'Your details' },
  { id: 'client', title: 'Client details' },
  { id: 'job', title: 'Job and amounts' },
  { id: 'gst', title: 'GST' },
  { id: 'payment', title: 'Payment on invoice' },
] as const

type StepId = (typeof STEPS)[number]['id']

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="ip-field">
      <label htmlFor={id}>{label}</label>
      {hint ? <p className="ip-hint">{hint}</p> : null}
      {children}
    </div>
  )
}

function stepIndex(id: StepId): number {
  return STEPS.findIndex((step) => step.id === id)
}

function previewInput(form: PackInput): PackInput {
  const filled = (form.lines ?? []).filter((line) => clean(line.description) || clean(line.amount))
  const invoiceNumber = clean(form.invoiceNumber)
  return {
    ...form,
    supplierName: clean(form.supplierName) || 'Your name',
    clientName: clean(form.clientName) || 'Your client',
    invoiceNumber: /^[A-Za-z0-9\-/]{1,16}$/.test(invoiceNumber) ? invoiceNumber : 'INV-001',
    lines: filled.length
      ? filled.map((line) => ({ description: clean(line.description) || 'Line item', amount: clean(line.amount) || '0' }))
      : [{ description: 'Your first line item', amount: '0' }],
  }
}

function useLivePreview(form: PackInput) {
  const pack = useMemo(() => buildPack(previewInput(form)), [form])
  const [lastGood, setLastGood] = useState<Invoice | null>(null)
  if (pack.ok && pack.invoice && pack.invoice !== lastGood) setLastGood(pack.invoice)
  return { invoice: pack.ok && pack.invoice ? pack.invoice : lastGood, stale: !pack.ok }
}

const panelVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -28 }),
}

export function InvoiceBuilder() {
  const [form, setForm] = useState<PackInput>(() => emptyPack(todayKolkata()))
  const [step, setStep] = useState<StepId>('seller')
  const [direction, setDirection] = useState(1)
  const [result, setResult] = useState<ReturnType<typeof buildPack> | null>(null)
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const panelHeadingRef = useRef<HTMLHeadingElement>(null)
  const userNavigated = useRef(false)
  const lines = form.lines ?? []
  const idx = stepIndex(step)
  const preview = useLivePreview(form)
  const done = Boolean(result?.ok && result.invoice)

  function patch(partial: PackInput) {
    setForm((current) => ({ ...current, ...partial }))
  }

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= STEPS.length || nextIndex === idx) return
    userNavigated.current = true
    setDirection(nextIndex > idx ? 1 : -1)
    setStep(STEPS[nextIndex].id)
  }

  function generate() {
    const next = buildPack(form)
    setResult(next)
    if (next.ok) userNavigated.current = true
  }

  useEffect(() => {
    if (!userNavigated.current) return
    userNavigated.current = false
    const section = sectionRef.current
    if (section && section.getBoundingClientRect().top < 0) {
      section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
    if (!done) panelHeadingRef.current?.focus({ preventScroll: true })
  }, [step, done, reduce])

  if (done && result?.invoice) {
    const invoice = result.invoice
    return (
      <section id="create" ref={sectionRef} className="ip-section ip-result" aria-labelledby="result-heading">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <div className="ip-result-head">
            <div>
              <p className="ip-label">Your pack</p>
              <h2 id="result-heading">Your invoice pack is ready to review.</h2>
              <p className="ip-lede">
                {PROTECTED_EXPORTS
                  ? 'Check the draft and reminders. The preview is watermarked. Pay once to export the final invoice.'
                  : 'Check the draft and reminders. Nothing is uploaded. When you are satisfied, print or copy what you will send, then continue to payment.'}
              </p>
            </div>
            <div className="ip-result-summary no-print">
              <p>
                <span>Total due</span>
                <strong>
                  <CountUp value={invoice.balance} format={inr} />
                </strong>
              </p>
              {invoice.taxLines.length ? (
                <p>
                  <span>GST</span>
                  <strong>{inr(invoice.taxTotal)}</strong>
                </p>
              ) : null}
            </div>
          </div>
          <Warnings warnings={result.warnings} />
          <div className="ip-result-grid">
            <div className="ip-doc-preview">
              <InvoiceSheet invoice={invoice} draft={PROTECTED_EXPORTS} testId="pack-sheet" />
            </div>
            <section className="ip-reminders-block" aria-labelledby="pack-reminders-heading">
              <h3 id="pack-reminders-heading">Three payment reminders</h3>
              <Reminders reminders={result.reminders} />
            </section>
          </div>
          <div className="ip-actions ip-result-actions no-print">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                userNavigated.current = true
                setResult(null)
                setDirection(-1)
                setStep('seller')
              }}
            >
              Edit details
            </button>
            {PROTECTED_EXPORTS ? null : (
              <>
                <button type="button" className="secondary" onClick={() => window.print()}>
                  Print or save as PDF
                </button>
                <a className="ip-btn" href="#pricing">
                  Continue to payment
                  <span className="ip-btn-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </>
            )}
          </div>
          {PROTECTED_EXPORTS ? <ExportPanel kind="invoice" getInput={() => form} /> : null}
        </motion.div>
      </section>
    )
  }

  return (
    <section id="create" ref={sectionRef} className="ip-section ip-create" aria-labelledby="create-heading">
      <Reveal className="ip-section-head">
        <p className="ip-label">Create your invoice</p>
        <h2 id="create-heading">Enter your job details</h2>
        <p className="ip-lede">
          Work through each step. You can go back any time. Your draft stays in this browser until you refresh the
          page.
        </p>
      </Reveal>
      <Reveal className="ip-builder" delay={0.05}>
      <div className="ip-builder-form">
      <div className="ip-progress no-print">
        <div className="ip-progress-track" aria-hidden="true">
          <motion.div
            className="ip-progress-fill"
            initial={false}
            animate={{ scaleX: (idx + 1) / STEPS.length }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
        <ol className="ip-wizard-steps" aria-label="Progress">
          {STEPS.map((item, i) => (
            <li
              key={item.id}
              className={`ip-wizard-step${item.id === step ? ' current' : ''}${i < idx ? ' done' : ''}`}
            >
              <button
                type="button"
                className="ip-plain ip-wizard-step-btn"
                aria-current={item.id === step ? 'step' : undefined}
                onClick={() => goTo(i)}
              >
                <span className="ip-wizard-step-num" aria-hidden="true">
                  {i < idx ? '✓' : String(i + 1).padStart(2, '0')}
                </span>
                <span className="ip-wizard-step-label">{item.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <form
        className="ip-wizard no-print"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 'payment') generate()
          else goTo(idx + 1)
        }}
      >
        <h3 className="ip-panel-title" ref={panelHeadingRef} tabIndex={-1}>
          <span>
            Step {idx + 1} of {STEPS.length}
          </span>
          {STEPS[idx].title}
        </h3>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={panelVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
        {step === 'seller' ? (
          <div className="ip-wizard-panel">
            <Field id="supplierName" label="Your name or trade name">
              <input
                id="supplierName"
                maxLength={120}
                required
                value={form.supplierName ?? ''}
                onChange={(event) => patch({ supplierName: event.target.value })}
              />
            </Field>
            <Field id="supplierState" label="Your state">
              <StateSelect
                id="supplierState"
                value={form.supplierState ?? ''}
                onChange={(supplierState) => patch({ supplierState })}
              />
            </Field>
            <Field id="supplierAddress" label="Your address" hint="Printed on the invoice. Keep it short.">
              <textarea
                id="supplierAddress"
                maxLength={240}
                value={form.supplierAddress ?? ''}
                onChange={(event) => patch({ supplierAddress: event.target.value })}
              />
            </Field>
            <div className="ip-check-block">
              <label className="ip-check">
                <input
                  id="gstRegistered"
                  type="checkbox"
                  checked={Boolean(form.gstRegistered)}
                  onChange={(event) => patch({ gstRegistered: event.target.checked })}
                />
                I am GST-registered
              </label>
              <p className="ip-hint">
                Turn this on only if you are registered. The draft adds GST when the client is in India. If you are not
                registered, leave it off and the draft will not add GST.
              </p>
            </div>
            {form.gstRegistered ? (
              <Field id="supplierGstin" label="Your GSTIN" hint="Required on a tax invoice if you are registered.">
                <input
                  id="supplierGstin"
                  maxLength={15}
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={form.supplierGstin ?? ''}
                  onChange={(event) => patch({ supplierGstin: event.target.value })}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        {step === 'client' ? (
          <div className="ip-wizard-panel">
            <Field id="clientName" label="Client name">
              <input
                id="clientName"
                maxLength={160}
                required
                value={form.clientName ?? ''}
                onChange={(event) => patch({ clientName: event.target.value })}
              />
            </Field>
            <Field id="clientAddress" label="Client address">
              <textarea
                id="clientAddress"
                maxLength={240}
                value={form.clientAddress ?? ''}
                onChange={(event) => patch({ clientAddress: event.target.value })}
              />
            </Field>
            <div className="ip-check-block">
              <label className="ip-check">
                <input
                  id="foreignClient"
                  type="checkbox"
                  checked={Boolean(form.foreignClient)}
                  onChange={(event) => patch({ foreignClient: event.target.checked })}
                />
                Client is outside India
              </label>
              <p className="ip-hint">
                For a client outside India, the draft does not add GST. Confirm export treatment with a chartered
                accountant before you send it.
              </p>
            </div>
            {!form.foreignClient ? (
              <Field
                id="clientState"
                label="Client state"
                hint="Same state as you: CGST and SGST. Different state: IGST."
              >
                <StateSelect
                  id="clientState"
                  value={form.clientState ?? ''}
                  onChange={(clientState) => patch({ clientState })}
                />
              </Field>
            ) : null}
            <Field id="clientGstin" label="Client GSTIN (optional)">
              <input
                id="clientGstin"
                maxLength={15}
                autoCapitalize="characters"
                spellCheck={false}
                value={form.clientGstin ?? ''}
                onChange={(event) => patch({ clientGstin: event.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {step === 'job' ? (
          <div className="ip-wizard-panel">
            <div className="ip-row">
              <Field id="invoiceNumber" label="Invoice number">
                <input
                  id="invoiceNumber"
                  maxLength={16}
                  required
                  spellCheck={false}
                  value={form.invoiceNumber ?? ''}
                  onChange={(event) => patch({ invoiceNumber: event.target.value })}
                />
              </Field>
              <Field id="invoiceDate" label="Invoice date">
                <input
                  id="invoiceDate"
                  type="date"
                  required
                  value={form.invoiceDate ?? ''}
                  onChange={(event) => patch({ invoiceDate: event.target.value })}
                />
              </Field>
            </div>
            <Field id="dueDays" label="Days until payment is due">
              <input
                id="dueDays"
                type="number"
                min={0}
                max={180}
                step={1}
                value={form.dueDays ?? 15}
                onChange={(event) => patch({ dueDays: event.target.value })}
              />
            </Field>
            <h3>Line items</h3>
            {lines.map((line, index) => (
              <div className="ip-row" key={'line-' + index}>
                <Field id={`line-desc-${index}`} label={`Line ${index + 1} — description`}>
                  <input
                    id={`line-desc-${index}`}
                    maxLength={180}
                    value={line.description ?? ''}
                    onChange={(event) => {
                      const next = lines.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description: event.target.value } : item,
                      )
                      patch({ lines: next })
                    }}
                  />
                </Field>
                <Field id={`line-amt-${index}`} label="Amount in rupees">
                  <input
                    id={`line-amt-${index}`}
                    inputMode="decimal"
                    value={String(line.amount ?? '')}
                    onChange={(event) => {
                      const next = lines.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, amount: event.target.value } : item,
                      )
                      patch({ lines: next })
                    }}
                  />
                </Field>
              </div>
            ))}
            <div className="ip-actions">
              <button
                type="button"
                className="secondary"
                disabled={lines.length >= 8}
                onClick={() => patch({ lines: [...lines, { description: '', amount: '' }] })}
              >
                Add a line
              </button>
              <button
                type="button"
                className="secondary"
                disabled={lines.length <= 1}
                onClick={() => patch({ lines: lines.slice(0, -1) })}
              >
                Remove a line
              </button>
            </div>
            <div className="ip-row">
              <Field id="sac" label="SAC code" hint="Service accounting code. Default 9983 is common for freelance services.">
                <input
                  id="sac"
                  maxLength={12}
                  spellCheck={false}
                  value={form.sac ?? '9983'}
                  onChange={(event) => patch({ sac: event.target.value })}
                />
              </Field>
              <Field id="alreadyReceived" label="Already received (optional)">
                <input
                  id="alreadyReceived"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.alreadyReceived ?? '0'}
                  onChange={(event) => patch({ alreadyReceived: event.target.value })}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 'gst' ? (
          <div className="ip-wizard-panel">
            <Field
              id="gstRate"
              label="GST rate %"
              hint="Used only when you are registered and the client is in India."
            >
              <input
                id="gstRate"
                type="number"
                min={0}
                max={28}
                step="0.01"
                value={form.gstRate ?? 18}
                onChange={(event) => patch({ gstRate: event.target.value })}
              />
            </Field>
            <div className="ip-check-block">
              <label className="ip-check">
                <input
                  id="reverseCharge"
                  type="checkbox"
                  checked={Boolean(form.reverseCharge)}
                  onChange={(event) => patch({ reverseCharge: event.target.checked })}
                />
                Tax is payable by the client on reverse charge
              </label>
              <p className="ip-hint">
                Turn this on only when reverse charge applies. GST is then noted on the draft and not added to the
                balance the client pays you.
              </p>
            </div>
          </div>
        ) : null}

        {step === 'payment' ? (
          <div className="ip-wizard-panel">
            <p className="ip-hint">
              These details are printed for your client. They are not used to pay Invoice Pack.
            </p>
            <Field id="upi" label="Your UPI id">
              <input
                id="upi"
                maxLength={50}
                spellCheck={false}
                autoComplete="off"
                value={form.upi ?? ''}
                onChange={(event) => patch({ upi: event.target.value })}
              />
            </Field>
            <div className="ip-row">
              <Field id="bankName" label="Bank name (optional)">
                <input
                  id="bankName"
                  maxLength={80}
                  value={form.bankName ?? ''}
                  onChange={(event) => patch({ bankName: event.target.value })}
                />
              </Field>
              <Field id="accountName" label="Account name (optional)">
                <input
                  id="accountName"
                  maxLength={120}
                  value={form.accountName ?? ''}
                  onChange={(event) => patch({ accountName: event.target.value })}
                />
              </Field>
            </div>
            <div className="ip-row">
              <Field id="accountNumber" label="Account number (optional)">
                <input
                  id="accountNumber"
                  inputMode="numeric"
                  maxLength={18}
                  autoComplete="off"
                  value={form.accountNumber ?? ''}
                  onChange={(event) => patch({ accountNumber: event.target.value })}
                />
              </Field>
              <Field id="ifsc" label="IFSC (optional)">
                <input
                  id="ifsc"
                  maxLength={11}
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={form.ifsc ?? ''}
                  onChange={(event) => patch({ ifsc: event.target.value })}
                />
              </Field>
            </div>
            <Field id="remarks" label="Remarks on the invoice (optional)">
              <textarea
                id="remarks"
                maxLength={300}
                value={form.remarks ?? ''}
                onChange={(event) => patch({ remarks: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
        </motion.div>
        </AnimatePresence>

        {result && !result.ok ? <Errors errors={result.errors} /> : null}

        <div className="ip-wizard-nav">
          <button type="button" className="secondary" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
            Back
          </button>
          <button type="submit">
            {step === 'payment' ? 'Generate invoice pack' : 'Continue'}
            <span className="ip-btn-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </form>
      </div>
      <aside className="ip-builder-preview no-print" aria-label="Live preview of your invoice">
        <div className="ip-preview-sticky">
        <div className="ip-preview-head">
          <p className="ip-preview-label">
            <span className="ip-live-dot" aria-hidden="true" />
            Live preview
          </p>
          {preview.invoice ? (
            <p className="ip-preview-total">
              <span>Balance due</span>
              <strong>
                <CountUp value={preview.invoice.balance} format={inr} />
              </strong>
            </p>
          ) : null}
        </div>
        <div className="ip-preview-paper">
          {preview.invoice ? <PaperPreview invoice={preview.invoice} /> : null}
        </div>
        <p className="ip-preview-note">
          {preview.stale
            ? 'Some details need fixing before the preview can update. Generate the pack to see what to change.'
            : 'Updates as you type. Placeholders fill anything you have not entered yet.'}
        </p>
        </div>
      </aside>
      </Reveal>
    </section>
  )
}