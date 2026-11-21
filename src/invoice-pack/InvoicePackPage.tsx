import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { CONTACT_EMAIL, INVOICE_CHECKOUT, INVOICE_DESCRIPTION, INVOICE_TITLE, buildPack, demoInput } from './logic'
import { AdvanceOffer } from './AdvanceOffer'
import { ExampleInvoice } from './ExampleInvoice'
import { InvoiceBuilder } from './InvoiceBuilder'
import { PaperPreview } from './PaperPreview'
import { PayBox } from './PayBox'
import './invoice-pack.css'

const JOURNEY = [
  'Understand what Invoice Pack does.',
  'See a realistic example of the invoice and reminders.',
  'Enter your job details in the step-by-step builder.',
  'Review the draft, totals, and three reminder messages.',
  'Read any warnings that apply to your job.',
  'Pay ₹499 by UPI when you are ready.',
  'Save your payment reference here. Payment is checked manually — this page does not confirm it automatically.',
] as const

const TOP_COMPACT_SCROLL = 28

function useTopBarCompact(threshold = TOP_COMPACT_SCROLL) {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    let frame = 0
    const sync = () => {
      setCompact(window.scrollY > threshold)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        sync()
      })
    }
    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [threshold])

  return compact
}

function useInvoiceMeta() {
  useLayoutEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content')
    const canonical = document.querySelector('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    const ogTitle = document.querySelector('meta[property="og:title"]')
    const previousOgTitle = ogTitle?.getAttribute('content')
    const ogDescription = document.querySelector('meta[property="og:description"]')
    const previousOgDescription = ogDescription?.getAttribute('content')
    const ogUrl = document.querySelector('meta[property="og:url"]')
    const previousOgUrl = ogUrl?.getAttribute('content')
    document.title = INVOICE_TITLE
    description?.setAttribute('content', INVOICE_DESCRIPTION)
    canonical?.setAttribute('href', 'https://buildwsai.online/invoice-pack')
    ogTitle?.setAttribute('content', INVOICE_TITLE)
    ogDescription?.setAttribute('content', INVOICE_DESCRIPTION)
    ogUrl?.setAttribute('content', 'https://buildwsai.online/invoice-pack')
    return () => {
      document.title = previousTitle
      if (previousDescription != null) description?.setAttribute('content', previousDescription)
      if (previousCanonical != null) canonical?.setAttribute('href', previousCanonical)
      if (previousOgTitle != null) ogTitle?.setAttribute('content', previousOgTitle)
      if (previousOgDescription != null) ogDescription?.setAttribute('content', previousOgDescription)
      if (previousOgUrl != null) ogUrl?.setAttribute('content', previousOgUrl)
    }
  }, [])
}

export default function InvoicePackPage() {
  useInvoiceMeta()
  const topCompact = useTopBarCompact()
  const hero = useMemo(() => buildPack(demoInput({ gst: true, foreign: false, sameState: false })), [])

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '')
    if (!id) return
    document.getElementById(id)?.scrollIntoView()
  }, [])

  return (
    <div className={`invoice-pack${topCompact ? ' invoice-pack--top-compact' : ''}`}>
      <a className="ip-skip" href="#main">
        Skip to content
      </a>
      <header className={`ip-top${topCompact ? ' ip-top--compact' : ''}`}>
        <div className="ip-wrap ip-top-inner">
          <a className="ip-brand" href="#product">
            Invoice Pack
          </a>
          <nav aria-label="Invoice Pack">
            <a href="#create">Create</a>
            <a href="#example">Example</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#advance">Advance Receipt</a>
            <a href="#about">About</a>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section id="product" className="ip-hero">
          <div className="ip-wrap ip-hero-grid">
            <div className="ip-hero-copy">
              <p className="ip-label">For freelancers in India</p>
              <h1>Create your invoice. Get paid.</h1>
              <p className="ip-lede">
                Turn a completed freelance job into a professional invoice and three payment reminders, ready to send
                to your client.
              </p>
              <p className="ip-price">
                <span className="ip-price-num">₹499</span>
                <span className="ip-price-note">· One-time payment</span>
              </p>
              <div className="ip-hero-actions">
                <a className="ip-btn" href="#create">
                  Create your invoice →
                </a>
                <a className="ip-btn secondary" href="#example">
                  See an example
                </a>
              </div>
            </div>
            <div className="ip-hero-visual">
              {hero.invoice ? (
                <div className="ip-stack">
                  <div className="ip-stack-back" aria-hidden="true" />
                  <div className="ip-stack-front">
                    <PaperPreview invoice={hero.invoice} demo />
                  </div>
                </div>
              ) : null}
            </div>
            <ol className="ip-hero-reminders">
              <li>
                <span>01</span>
                <div>
                  <strong>One invoice</strong>
                  <p>Line items, totals, and GST when it applies.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Three reminders</strong>
                  <p>Ready to copy and send on your timeline.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Your browser only</strong>
                  <p>Nothing is uploaded. You control what you send.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section id="how-it-works" className="ip-band" aria-labelledby="journey-heading">
          <div className="ip-wrap ip-journey">
            <p className="ip-label" id="journey-heading">
              How it works
            </p>
            <ol className="ip-journey-list">
              {JOURNEY.map((line, index) => (
                <li key={line}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{line}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="ip-wrap">
          <ExampleInvoice />
          <InvoiceBuilder />

          <section id="receive" className="ip-section" aria-labelledby="receive-heading">
            <p className="ip-label">What you receive</p>
            <h2 id="receive-heading">One pack for one finished job.</h2>
            <ul className="ip-quiet-list ip-receive-list">
              <li>One draft invoice with your details, your client, line items, and the balance due.</li>
              <li>GST split as CGST and SGST or IGST when you are registered and the client is in India.</li>
              <li>Your UPI id or bank details printed for your client to pay you.</li>
              <li>Three messages: with the invoice, about 7 days later, and about 14 days later.</li>
              <li>A print view. Use your browser’s print dialog to save a PDF.</li>
            </ul>
            <p className="ip-fine">
              This is not an e-invoice, not a GST filing, and not tax advice. No one files this on the GST portal for
              you.
            </p>
          </section>

          <section id="pricing" className="ip-section" aria-labelledby="pricing-heading">
            <p className="ip-label">Pricing</p>
            <h2 id="pricing-heading">₹499 · one time</h2>
            <p className="ip-lede ip-lede-narrow">
              Pay once for one invoice pack. There is no subscription. Advance Receipt is a separate offer below if you
              need it.
            </p>
            <div className="ip-pay-intro no-print">
              <h3>How payment works</h3>
              <p>
                Pay ₹499 using UPI. Enter the payment reference from your UPI app so your order can be identified. Saving
                a reference here does not prove payment, does not confirm delivery, and does not mark your order paid
                automatically.
              </p>
            </div>
            <p className="ip-fine no-print">
              After you pay, payment is checked against the UPI account. This page cannot verify it on its own.
            </p>
            <div id="pay-499">
              <PayBox checkout={INVOICE_CHECKOUT} />
            </div>
          </section>

          <AdvanceOffer />

          <section id="about" className="ip-section" aria-labelledby="about-heading">
            <p className="ip-label">About</p>
            <h2 id="about-heading">Sai Vidyut</h2>
            <div className="ip-prose">
              <p>
                Invoice Pack is for a freelancer or solo consultant in India who has finished work and needs to bill a
                client. Sai Vidyut built this page. It is not a chartered accountant, not a law firm, and not a design
                studio.
              </p>
              <p>
                What you type stays in this browser unless you copy or print it. Invoice Pack does not publish customer
                names, reviews, or revenue figures.
              </p>
              <p>
                Contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. That address is public so you can
                write. It is not consent to receive marketing. To opt out of notes, email that address.
              </p>
              <p>
                <a href="/" data-testid="portfolio-link">
                  Back to the portfolio
                </a>
              </p>
            </div>
          </section>

          <section id="legal" className="ip-section ip-legal" aria-labelledby="legal-heading">
            <p className="ip-label">Disclosures</p>
            <h2 id="legal-heading">Tax, privacy, and payment</h2>
            <ul className="ip-quiet-list">
              <li>The draft is calculated in this browser from what you enter. It is not uploaded to a server.</li>
              <li>GST appears only when you say you are registered and the client is in India.</li>
              <li>
                UPI payee for this product: {INVOICE_CHECKOUT.pa}. Amount ₹499. Order reference is the same in tn and tr.
                The QR code is that link.
              </li>
              <li>A UTR you save is stored as payment_pending in this browser only.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}