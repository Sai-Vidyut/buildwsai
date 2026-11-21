import { useRef, useState, type ReactNode } from 'react'
import { STATES, buildPack, emptyPack, inr, todayKolkata, type PackInput } from './logic'
import { Errors, InvoiceSheet, Reminders, Warnings } from './Sheets'

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

export function InvoiceBuilder() {
  const [form, setForm] = useState<PackInput>(() => emptyPack(todayKolkata()))
  const [step, setStep] = useState<StepId>('seller')
  const [result, setResult] = useState<ReturnType<typeof buildPack> | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const lines = form.lines ?? []
  const idx = stepIndex(step)

  function patch(partial: PackInput) {
    setForm((current) => ({ ...current, ...partial }))
  }

  function goNext() {
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id)
  }

  function goBack() {
    if (idx > 0) setStep(STEPS[idx - 1].id)
  }

  function generate() {
    const next = buildPack(form)
    setResult(next)
    if (next.ok) outputRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }

  if (result?.ok && result.invoice) {
    const invoice = result.invoice
    return (
      <section id="create" className="ip-section" aria-labelledby="result-heading">
        <p className="ip-label">Your pack</p>
        <h2 id="result-heading">Your invoice pack is ready to review.</h2>
        <p className="ip-lede ip-lede-narrow">
          Check the draft and reminders. Nothing is uploaded. When you are satisfied, print or copy what you will
          send, then continue to payment.
        </p>
        <div ref={outputRef} className="ip-result-summary no-print">
          <p>
            <span>Total due</span>
            <strong>{inr(invoice.balance)}</strong>
          </p>
          {invoice.taxLines.length ? (
            <p>
              <span>GST</span>
              <strong>{inr(invoice.taxTotal)}</strong>
            </p>
          ) : null}
        </div>
        <Warnings warnings={result.warnings} />
        <InvoiceSheet invoice={invoice} testId="pack-sheet" />
        <h3>Three payment reminders</h3>
        <Reminders reminders={result.reminders} />
        <div className="ip-actions no-print">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setResult(null)
              setStep('seller')
            }}
          >
            Edit details
          </button>
          <button type="button" onClick={() => window.print()}>
            Print or save as PDF
          </button>
          <a className="ip-btn" href="#pricing">
            Continue to payment →
          </a>
        </div>
      </section>
    )
  }

  return (
    <section id="create" className="ip-section" aria-labelledby="create-heading">
      <p className="ip-label">Create your invoice</p>
      <h2 id="create-heading">Enter your job details</h2>
      <p className="ip-lede ip-lede-narrow">
        Work through each step. You can go back any time. Your draft stays in this browser until you refresh the
        page.
      </p>
      <ol className="ip-wizard-steps no-print" aria-label="Progress">
        {STEPS.map((item, i) => (
          <li key={item.id} className={item.id === step ? 'current' : i < idx ? 'done' : ''}>
            <span>{String(i + 1).padStart(2, '0')}</span> {item.title}
          </li>
        ))}
      </ol>
      <form
        className="ip-wizard no-print"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 'payment') generate()
          else goNext()
        }}
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
              <select
                id="supplierState"
                value={form.supplierState ?? ''}
                onChange={(event) => patch({ supplierState: event.target.value })}
              >
                <option value="">Select a state</option>
                {STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </Field>
            <Field id="supplierAddress" label="Your address" hint="Printed on the invoice. Keep it short.">
              <textarea
                id="supplierAddress"
                maxLength={240}
                value={form.supplierAddress ?? ''}
                onChange={(event) => patch({ supplierAddress: event.target.value })}
              />
            </Field>
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
            {!form.foreignClient ? (
              <Field
                id="clientState"
                label="Client state"
                hint="Same state as you: CGST and SGST. Different state: IGST."
              >
                <select
                  id="clientState"
                  value={form.clientState ?? ''}
                  onChange={(event) => patch({ clientState: event.target.value })}
                >
                  <option value="">Select a state</option>
                  {STATES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name} ({code})
                    </option>
                  ))}
                </select>
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

        {result && !result.ok ? <Errors errors={result.errors} /> : null}

        <div className="ip-wizard-nav">
          <button type="button" className="secondary" disabled={idx === 0} onClick={goBack}>
            Back
          </button>
          <button type="submit">{step === 'payment' ? 'Generate invoice pack' : 'Continue'}</button>
        </div>
      </form>
    </section>
  )
}