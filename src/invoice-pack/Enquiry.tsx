import { useState } from 'react'
import { loadEnquiries, saveEnquiry, type StoredEnquiry } from './storage'

export function Enquiry() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<StoredEnquiry[]>(() => loadEnquiries())

  return (
    <section id="enquiry" className="ip-section no-print" aria-labelledby="enquiry-heading">
      <h2 id="enquiry-heading">Ask to be billed when payment works</h2>
      <p>
        Leave your name and email if you want this pack for a live client after a payment account is
        connected. This stores the note in this browser only. It is not emailed. It is not a payment.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const nextName = name.trim()
          const nextEmail = email.trim()
          const nextNote = note.trim()
          if (!nextName || !nextEmail || !nextNote || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
            setMessage('')
            setError('Enter a name, a real email, and a short note.')
            return
          }
          const item: StoredEnquiry = {
            name: nextName.slice(0, 120),
            email: nextEmail.slice(0, 160),
            note: nextNote.slice(0, 1000),
            at: new Date().toISOString(),
            payment: false,
            sent: false,
          }
          const stored = saveEnquiry(item)
          setError('')
          setMessage(
            stored
              ? 'Enquiry recorded below. No payment was taken. Saved in this browser only. It was not emailed, because no inbox is connected.'
              : 'Enquiry recorded below. No payment was taken. This browser blocked local storage. The text below is the only copy. It was not emailed.',
          )
          setRows(loadEnquiries())
        }}
      >
        <div className="ip-field">
          <label htmlFor="enqName">Your name</label>
          <input id="enqName" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="ip-field">
          <label htmlFor="enqEmail">Email</label>
          <input
            id="enqEmail"
            type="email"
            maxLength={160}
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="ip-field">
          <label htmlFor="enqNote">What the job is</label>
          <textarea id="enqNote" maxLength={1000} required value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="ip-actions">
          <button type="submit">Save enquiry on this browser</button>
        </div>
      </form>
      {error ? (
        <p className="ip-err" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {rows.length ? (
        <div data-testid="enquiry-list">
          <h3>Enquiries saved on this browser</h3>
          {rows.map((item) => (
            <article key={item.at + item.email} className="ip-sheet">
              <p>
                {item.name} &lt;{item.email}&gt;
              </p>
              <p>{item.note}</p>
              <p>Saved {item.at}. Payment taken: no. Sent to us: no.</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
