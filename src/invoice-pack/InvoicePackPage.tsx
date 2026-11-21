import { useEffect, useLayoutEffect, useMemo } from 'react'
import { CONTACT_EMAIL, INVOICE_CHECKOUT, INVOICE_DESCRIPTION, INVOICE_TITLE, buildPack, demoInput } from './logic'
import { AdvanceOffer } from './AdvanceOffer'
import { DemoInvoice } from './DemoInvoice'
import { Enquiry } from './Enquiry'
import { OwnPack } from './OwnPack'
import { PaperPreview } from './PaperPreview'
import { PayBox } from './PayBox'
import './invoice-pack.css'

const HERO_REMINDERS = [
  {
    n: '01',
    title: 'With the invoice',
    text: 'Initial message with the draft and payment details.',
  },
  {
    n: '02',
    title: '7 days later',
    text: 'A polite follow-up if payment is pending.',
  },
  {
    n: '03',
    title: '14 days later',
    text: 'A final reminder with clear next steps.',
  },
] as const

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
  const hero = useMemo(() => buildPack(demoInput({ gst: true, foreign: false, sameState: false })), [])

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '')
    if (!id) return
    document.getElementById(id)?.scrollIntoView()
  }, [])

  return (
    <div className="invoice-pack">
      <a className="ip-skip" href="#main">
        Skip to content
      </a>
      <header className="ip-top">
        <div className="ip-wrap ip-top-inner">
          <a className="ip-brand" href="#product">
            Invoice Pack
          </a>
          <nav aria-label="Invoice Pack">
            <a href="#demo">Demo</a>
            <a href="#pricing">Pricing</a>
            <a href="#advance">Advance Receipt</a>
            <a href="#built">How It Works</a>
            <a href="#about">About</a>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section id="product" className="ip-hero">
          <div className="ip-wrap ip-hero-grid">
            <div className="ip-hero-copy">
              <p className="ip-label">For independent freelancers</p>
              <h1>Get paid for the work you’ve already finished.</h1>
              <p className="ip-lede">
                A professional invoice and three thoughtful payment reminders. Ready to send to your client.
              </p>
              <p className="ip-price">
                <span className="ip-price-num">₹499</span>
                <span className="ip-price-note">/ one time</span>
              </p>
              <div className="ip-hero-actions">
                <a className="ip-btn" href="#demo">
                  Try the Demo →
                </a>
                <a className="ip-btn secondary" href="#included">
                  What’s Included
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
              {HERO_REMINDERS.map((reminder) => (
                <li key={reminder.n}>
                  <span>{reminder.n}</span>
                  <div>
                    <strong>{reminder.title}</strong>
                    <p>{reminder.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="ip-band" aria-labelledby="process-heading">
          <div className="ip-wrap ip-process">
            <p className="ip-label" id="process-heading">
              The process
            </p>
            <article className="ip-step">
              <p className="ip-step-num">01</p>
              <h3>Enter your job</h3>
              <p>Add your client, items, amount and GST details.</p>
            </article>
            <span className="ip-process-arrow" aria-hidden="true">
              →
            </span>
            <article className="ip-step">
              <p className="ip-step-num">02</p>
              <h3>Generate your pack</h3>
              <p>A draft invoice plus three payment reminders.</p>
            </article>
            <span className="ip-process-arrow" aria-hidden="true">
              →
            </span>
            <article className="ip-step">
              <p className="ip-step-num">03</p>
              <h3>Send and collect</h3>
              <p>Share them with your client and close the payment.</p>
            </article>
          </div>
        </section>

        <div className="ip-wrap">
          <DemoInvoice />

          <section id="pricing" className="ip-section ip-products" aria-labelledby="products-heading">
            <p className="ip-label">The products</p>
            <div className="ip-products-grid">
              <h2 id="products-heading">Simple tools for everyday freelance work.</h2>
              <article className="ip-product">
                <div>
                  <h3>Invoice Pack</h3>
                  <p className="ip-product-price">
                    <span>₹499</span> / one time
                  </p>
                  <p>A professional invoice and three payment reminders.</p>
                </div>
                <a className="ip-arrow" href="#pay-499" aria-label="Open the Invoice Pack checkout">
                  →
                </a>
              </article>
              <article className="ip-product">
                <div>
                  <h3>Advance Receipt</h3>
                  <p className="ip-product-price">
                    <span>₹399</span> / one time
                  </p>
                  <p>A clean receipt for advance payments with balance tracking.</p>
                </div>
                <a className="ip-arrow" href="#pay-399" aria-label="Open the Advance Receipt checkout">
                  →
                </a>
              </article>
            </div>
            <div id="pay-499">
              <PayBox checkout={INVOICE_CHECKOUT} />
            </div>
          </section>

          <section id="included" className="ip-section" aria-labelledby="included-heading">
            <p className="ip-label">What’s included</p>
            <h2 id="included-heading">One pack, once.</h2>
            <div className="ip-split">
              <section>
                <h3>What you get</h3>
                <ul className="ip-quiet-list">
                  <li>A draft invoice: your name, the client, line items, taxable value, and CGST plus SGST or IGST if you are GST-registered and the client is in India.</li>
                  <li>The place of supply you entered, and a reverse-charge note if you turn that on. GST is then noted and not added to the balance.</li>
                  <li>Your UPI id or bank details on the draft.</li>
                  <li>Three messages: with the invoice, about 7 days later, and about 14 days later.</li>
                  <li>A print view. Use the browser’s print dialog and choose “Save as PDF” if you want a file.</li>
                </ul>
              </section>
              <section>
                <h3>What you do not get</h3>
                <ul className="ip-quiet-list">
                  <li>Filing on the GST portal, an IRN, or an e-invoice QR code.</li>
                  <li>Tax or legal advice. Confirm registration, SAC, rate, and export rules before you send the draft.</li>
                  <li>Anyone chasing the client for you.</li>
                  <li>An automatic confirmation that ₹499 was received. A UTR saved here is payment pending, not proof.</li>
                </ul>
              </section>
            </div>
          </section>

          <AdvanceOffer />
          <OwnPack />

          <section id="built" className="ip-section" aria-labelledby="built-heading">
            <p className="ip-label">How it works</p>
            <h2 id="built-heading">Calculated in the browser.</h2>
            <ul className="ip-quiet-list">
              <li>The draft is calculated on this page from what you type. The figures are not uploaded.</li>
              <li>GST is added only if you say you are registered and the client is in India. Same state: CGST and SGST. Different states: IGST.</li>
              <li>If you are not registered, the draft does not add GST. If the client is outside India, it does not add GST, and it tells you to confirm export treatment with a chartered accountant.</li>
              <li>Advance Receipt does not run that calculation.</li>
              <li>Print uses the browser. Choose “Save as PDF” there if you want a file.</li>
              <li>
                The UPI link is assembled here: payee {INVOICE_CHECKOUT.pa}, payee name Invoice Pack or Advance
                Receipt, amount 499 or 399, and the same order reference in both tn and tr. The QR code is that
                link.
              </li>
              <li>A UTR you submit is stored in this browser as payment_pending. This page cannot mark an order paid.</li>
              <li>This is not an e-invoice and not tax advice. There is no IRN, and nothing is filed on the GST portal.</li>
            </ul>
          </section>

          <section id="discovery" className="ip-section" aria-labelledby="discovery-heading">
            <p className="ip-label">Customer discovery</p>
            <h2 id="discovery-heading">What has happened so far.</h2>
            <div className="ip-prose">
              <p>
                Invoice Pack is an experiment for freelancers in India who need to bill one finished job. It is
                not a chartered accountant, not a law firm, and not a studio. This page does not claim an office,
                a team, a registration, customers, revenue, or reviews.
              </p>
              <p>Collected payments are the only score. No payment has been verified. The ledger is zero.</p>
              <p>
                Notes about Invoice Pack went out. Two people replied and were shown the draft format. One
                declined. One address bounced. No one has paid. The people who were written to are not listed
                here.
              </p>
              <p>
                Advance Receipt, at ₹399, is a second offer. It was started on 20 November 2026 because another
                way to collect payment was asked for while those replies were still open. It does not change the
                ₹499 invoice pack.
              </p>
            </div>
          </section>

          <Enquiry />

          <section id="about" className="ip-section" aria-labelledby="about-heading">
            <p className="ip-label">About</p>
            <h2 id="about-heading">Sai Vidyut</h2>
            <div className="ip-prose">
              <p>
                Invoice Pack is for a freelancer or solo consultant in India who has finished work and needs to
                bill the client. Sai Vidyut runs the experiment. It is not a human studio, not a chartered
                accountant, and not a law firm.
              </p>
              <p>
                Contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. That address is published so you
                can write. It is not consent to be sent a pitch. To opt out of notes, email that address.
              </p>
              <p>
                <a href="/" data-testid="portfolio-link">
                  Back to the portfolio
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
