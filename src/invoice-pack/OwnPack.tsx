import { useRef, useState, type ReactNode } from 'react'
import {
  STATES,
  buildPack,
  emptyPack,
  examplePack,
  todayKolkata,
  type PackInput,
} from './logic'
import { Errors, InvoiceSheet, Reminders, Warnings } from './Sheets'

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="ip-field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

export function OwnPack() {
  const [form, setForm] = useState<PackInput>(() => emptyPack(todayKolkata()))
  const [result, setResult] = useState<ReturnType<typeof buildPack> | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const lines = form.lines ?? []

  function patch(partial: PackInput) {
    setForm((current) => ({ ...current, ...partial }))
  }

  const stamped =
    form.supplierName === 'Example Studio' || form.clientName === 'Sample Client Pvt Ltd'

  return (
    <section id="prepare" className="ip-section" aria-labelledby="prepare-heading">
      <p className="ip-kicker">Your pack</p>
      <h2 id="prepare-heading">Prepare the pack</h2>
      <p>
        Enter the job here. Nothing is uploaded. Press “Prepare the pack”. The draft and the three messages
        appear on this page. Read the warnings before you send anything.
      </p>
      <form
        className="no-print"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault()
          const next = buildPack(form)
          setResult(next)
          if (next.ok) outputRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
        }}
      >
        <div className="ip-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setForm(examplePack())
              setResult(buildPack(examplePack()))
            }}
          >
            Fill an example
          </button>
        </div>
        {stamped ? (
          <p className="ip-muted">Example figures only. Sample Client Pvt Ltd is not a real customer.</p>
        ) : null}
        <div className="ip-row">
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
        </div>
        <Field id="supplierAddress" label="Your address">
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
          I am GST-registered and this draft should show GST
        </label>
        <Field id="supplierGstin" label="Your GSTIN, if you have one">
          <input
            id="supplierGstin"
            maxLength={15}
            autoCapitalize="characters"
            spellCheck={false}
            value={form.supplierGstin ?? ''}
            onChange={(event) => patch({ supplierGstin: event.target.value })}
          />
        </Field>
        <div className="ip-row">
          <Field id="clientName" label="Client name">
            <input
              id="clientName"
              maxLength={160}
              required
              value={form.clientName ?? ''}
              onChange={(event) => patch({ clientName: event.target.value })}
            />
          </Field>
          <Field id="clientState" label="Client state">
            <select
              id="clientState"
              value={form.clientState ?? ''}
              disabled={Boolean(form.foreignClient)}
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
        </div>
        <Field id="clientAddress" label="Client address">
          <textarea
            id="clientAddress"
            maxLength={240}
            value={form.clientAddress ?? ''}
            onChange={(event) => patch({ clientAddress: event.target.value })}
          />
        </Field>
        <Field id="clientGstin" label="Client GSTIN, if you have it">
          <input
            id="clientGstin"
            maxLength={15}
            autoCapitalize="characters"
            spellCheck={false}
            value={form.clientGstin ?? ''}
            onChange={(event) => patch({ clientGstin: event.target.value })}
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
        <div className="ip-row">
          <Field id="dueDays" label="Days until due">
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
          <Field id="sac" label="SAC">
            <input
              id="sac"
              maxLength={12}
              spellCheck={false}
              value={form.sac ?? '9983'}
              onChange={(event) => patch({ sac: event.target.value })}
            />
          </Field>
        </div>
        <div className="ip-row">
          <Field id="gstRate" label="GST rate % (used only if you are registered and the client is in India)">
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
          <Field id="alreadyReceived" label="Already received, INR">
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
        <label className="ip-check">
          <input
            id="reverseCharge"
            type="checkbox"
            checked={Boolean(form.reverseCharge)}
            onChange={(event) => patch({ reverseCharge: event.target.checked })}
          />
          Tax is payable by the client on reverse charge
        </label>
        <h3>Lines</h3>
        {lines.map((line, index) => (
          <div className="ip-row" key={'line-' + index}>
            <Field id={`line-desc-${index}`} label={`Line ${index + 1} description`}>
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
            <Field id={`line-amt-${index}`} label={`Line ${index + 1} amount`}>
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
        <h3>How they can pay you</h3>
        <p className="ip-muted">
          These are your details, printed for your client. This page does not collect them as a payment to us.
        </p>
        <div className="ip-row">
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
          <Field id="bankName" label="Bank name">
            <input
              id="bankName"
              maxLength={80}
              value={form.bankName ?? ''}
              onChange={(event) => patch({ bankName: event.target.value })}
            />
          </Field>
        </div>
        <div className="ip-row">
          <Field id="accountName" label="Account name">
            <input
              id="accountName"
              maxLength={120}
              value={form.accountName ?? ''}
              onChange={(event) => patch({ accountName: event.target.value })}
            />
          </Field>
          <Field id="accountNumber" label="Account number">
            <input
              id="accountNumber"
              inputMode="numeric"
              maxLength={18}
              autoComplete="off"
              value={form.accountNumber ?? ''}
              onChange={(event) => patch({ accountNumber: event.target.value })}
            />
          </Field>
        </div>
        <Field id="ifsc" label="IFSC">
          <input
            id="ifsc"
            maxLength={11}
            autoCapitalize="characters"
            spellCheck={false}
            value={form.ifsc ?? ''}
            onChange={(event) => patch({ ifsc: event.target.value })}
          />
        </Field>
        <Field id="remarks" label="Remarks on the invoice">
          <textarea
            id="remarks"
            maxLength={300}
            value={form.remarks ?? ''}
            onChange={(event) => patch({ remarks: event.target.value })}
          />
        </Field>
        <div className="ip-actions">
          <button type="submit">Prepare the pack</button>
        </div>
        {result && !result.ok ? <Errors errors={result.errors} /> : null}
      </form>
      {result?.ok && result.invoice ? (
        <div ref={outputRef}>
          <div className="ip-actions no-print">
            <button type="button" onClick={() => window.print()}>
              Print or save as PDF
            </button>
          </div>
          <Warnings warnings={result.warnings} />
          <InvoiceSheet invoice={result.invoice} demo={stamped} testId="pack-sheet" />
          <Reminders reminders={result.reminders} />
        </div>
      ) : null}
    </section>
  )
}
