import { useEffect, useLayoutEffect } from 'react'
import { CONTACT_EMAIL, INVOICE_CHECKOUT, INVOICE_DESCRIPTION, INVOICE_TITLE } from './logic'
import { AdvanceOffer } from './AdvanceOffer'
import { DemoInvoice } from './DemoInvoice'
import { Enquiry } from './Enquiry'
import { OwnPack } from './OwnPack'
import { PayBox } from './PayBox'
import './invoice-pack.css'

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
        <a className="ip-brand" href="#product">
          Invoice Pack
        </a>
        <nav aria-label="Invoice Pack">
          <a href="#demo">Demo</a>
          <a href="#pricing">Pricing</a>
          <a href="#advance">Advance receipt</a>
          <a href="#built">How it’s built</a>
          <a href="#discovery">Discovery</a>
          <a href="#about">About</a>
          <a href="/" data-testid="portfolio-link">
            Portfolio
          </a>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="ip-main">
          <header id="product">
            <p className="ip-kicker">India · Not a chartered accountant · Not a law firm</p>
            <h1>Invoice Pack</h1>
            <p className="ip-lead">
              One finished freelance job. One draft invoice an accounts person can read. Three messages to
              collect it.
            </p>
            <p className="ip-price">
              ₹499
              <span>Once, for one pack. Not a subscription.</span>
            </p>
            <div className="ip-split">
              <section>
                <h2>What you get</h2>
                <ul>
                  <li>A draft invoice: your name, the client, line items, taxable value, and CGST plus SGST or IGST if you say you are GST-registered and the client is in India.</li>
                  <li>The place of supply you entered, and a reverse-charge note if you turn that on. GST is then noted and not added to the balance.</li>
                  <li>Your own UPI id or bank details printed on the draft.</li>
                  <li>Three messages: one to send with the invoice, one about 7 days later, one about 14 days later.</li>
                  <li>A print view. Use the browser’s print dialog and choose “Save as PDF” if you want a file.</li>
                </ul>
              </section>
              <section>
                <h2>What you do not get</h2>
                <ul>
                  <li>Filing on the GST portal, an IRN, or an e-invoice QR code.</li>
                  <li>Tax or legal advice. Confirm registration, SAC, rate, and export rules before you send the draft.</li>
                  <li>Anyone chasing the client for you.</li>
                  <li>An automatic confirmation that ₹499 was received. A UTR saved here is payment pending, not proof.</li>
                </ul>
              </section>
            </div>
            <h2>How delivery works</h2>
            <ol>
              <li>Enter the job below. Nothing is uploaded.</li>
              <li>Press “Prepare the pack”. The invoice and the three messages appear on this page.</li>
              <li>Read the warnings. Print or copy what you will actually send.</li>
              <li>Pay ₹499 with the UPI checkout. Saving a UTR does not confirm that the money arrived.</li>
            </ol>
          </header>

          <DemoInvoice />

          <section id="pricing" className="ip-section no-print" aria-labelledby="pricing-heading">
            <p className="ip-kicker">Pricing</p>
            <h2 id="pricing-heading">Two prices, each once</h2>
            <div className="ip-facts">
              <div>
                <strong>₹499</strong>
                Invoice Pack. One draft invoice and three reminders for a finished freelance job.
              </div>
              <div>
                <strong>₹399</strong>
                Advance Receipt. One receipt and one message. No GST math. Available now.
              </div>
            </div>
            <div id="pay-499">
              <PayBox checkout={INVOICE_CHECKOUT} />
            </div>
          </section>

          <AdvanceOffer />
          <OwnPack />

          <section id="built" className="ip-section" aria-labelledby="built-heading">
            <p className="ip-kicker">How it is built</p>
            <h2 id="built-heading">Calculated in the browser</h2>
            <ul>
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
            <p className="ip-kicker">Customer discovery</p>
            <h2 id="discovery-heading">What has happened so far</h2>
            <p>
              Invoice Pack is an experiment for freelancers in India who need to bill one finished job. It is
              not a chartered accountant, not a law firm, and not a studio. This page does not claim an office,
              a team, a registration, customers, revenue, or reviews.
            </p>
            <p>
              Collected payments are the only score. No payment has been verified. The ledger for this
              experiment is zero.
            </p>
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
          </section>

          <Enquiry />

          <section id="about" className="ip-section" aria-labelledby="about-heading">
            <p className="ip-kicker">About and contact</p>
            <h2 id="about-heading">Sai Vidyut</h2>
            <p>
              Invoice Pack is for a freelancer or solo consultant in India who has finished work and needs to
              bill the client. Sai Vidyut runs the experiment. It is not a human studio, not a chartered
              accountant, and not a law firm.
            </p>
            <p>
              Contact{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. That address is published so you can
              write. It is not consent to be sent a pitch. To opt out of notes, email that address.
            </p>
            <p>
              <a href="/">Back to the portfolio</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
