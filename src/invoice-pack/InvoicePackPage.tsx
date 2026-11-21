import { useEffect, useLayoutEffect, useMemo } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { CONTACT_EMAIL, INVOICE_CHECKOUT, INVOICE_DESCRIPTION, INVOICE_TITLE, buildPack, demoInput } from './logic'
import { AdvanceOffer } from './AdvanceOffer'
import { ExampleInvoice } from './ExampleInvoice'
import { HeroVisual } from './HeroVisual'
import { InvoiceBuilder } from './InvoiceBuilder'
import { Reveal, RevealGroup, RevealItem } from './motion-kit'
import { EASE_OUT } from './motion-tokens'
import { PayBox } from './PayBox'
import { scrollToSection } from './scroll-to'
import { SiteHeader } from './SiteHeader'
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

const FEATURES = [
  { title: 'One invoice', body: 'Line items, totals, and GST when it applies.', icon: 'doc' },
  { title: 'Three reminders', body: 'Ready to copy and send on your timeline.', icon: 'msg' },
  { title: 'Your browser only', body: 'Nothing is uploaded. You control what you send.', icon: 'lock' },
] as const

const RECEIVE = [
  'One draft invoice with your details, your client, line items, and the balance due.',
  'GST split as CGST and SGST or IGST when you are registered and the client is in India.',
  'Your UPI id or bank details printed for your client to pay you.',
  'Three messages: with the invoice, about 7 days later, and about 14 days later.',
  'A print view. Use your browser’s print dialog to save a PDF.',
] as const

function FeatureIcon({ name }: { name: (typeof FEATURES)[number]['icon'] }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'doc') {
    return (
      <svg {...common}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4M10 12h5M10 16h5" />
      </svg>
    )
  }
  if (name === 'msg') {
    return (
      <svg {...common}>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M8 9.5h8M8 12.5h5" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
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
    document.documentElement.classList.add('ip-root')
    return () => {
      document.documentElement.classList.remove('ip-root')
      document.title = previousTitle
      if (previousDescription != null) description?.setAttribute('content', previousDescription)
      if (previousCanonical != null) canonical?.setAttribute('href', previousCanonical)
      if (previousOgTitle != null) ogTitle?.setAttribute('content', previousOgTitle)
      if (previousOgDescription != null) ogDescription?.setAttribute('content', previousOgDescription)
      if (previousOgUrl != null) ogUrl?.setAttribute('content', previousOgUrl)
    }
  }, [])
}

const HEADLINE = ['Create your invoice.', 'Get paid.'] as const

export default function InvoicePackPage() {
  useInvoiceMeta()
  const hero = useMemo(() => buildPack(demoInput({ gst: true, foreign: false, sameState: false })), [])

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '')
    if (!id) return
    document.getElementById(id)?.scrollIntoView()
  }, [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      const link = (event.target as Element | null)?.closest?.('.invoice-pack a[href^="#"]')
      const id = link?.getAttribute('href')?.slice(1)
      if (!id || id === 'main') return
      if (scrollToSection(id)) event.preventDefault()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="invoice-pack">
        <a className="ip-skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <section id="product" className="ip-hero" aria-labelledby="hero-heading">
            <div className="ip-hero-bg" aria-hidden="true" />
            <div className="ip-wrap ip-hero-main">
              <div className="ip-hero-copy">
                <motion.p
                  className="ip-eyebrow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                >
                  <span className="ip-eyebrow-dot" aria-hidden="true" />
                  For freelancers in India
                </motion.p>
                <h1 id="hero-heading" className="ip-hero-title">
                  {HEADLINE.map((line, index) => (
                    <span key={line} className="ip-line-mask">
                      <motion.span
                        className={index === 1 ? 'ip-line ip-line--accent' : 'ip-line'}
                        initial={{ y: '105%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.95, ease: EASE_OUT, delay: 0.1 + index * 0.12 }}
                      >
                        {line}
                      </motion.span>
                    </span>
                  ))}
                </h1>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.4 }}
                >
                  <p className="ip-lede ip-hero-lede">
                    Turn a completed freelance job into a professional invoice and three payment reminders, ready to send
                    to your client.
                  </p>
                  <div className="ip-hero-cta">
                    <a className="ip-btn ip-btn--lg" href="#create">
                      Create your invoice
                      <span className="ip-btn-arrow" aria-hidden="true">
                        →
                      </span>
                    </a>
                    <a className="ip-btn ip-btn--lg secondary" href="#example">
                      See an example
                    </a>
                  </div>
                  <p className="ip-price">
                    <span className="ip-price-num">₹499</span>
                    <span className="ip-price-note">One-time payment · No subscription</span>
                  </p>
                </motion.div>
              </div>
              <div className="ip-hero-visual">
                {hero.invoice ? <HeroVisual invoice={hero.invoice} reminders={hero.reminders} /> : null}
              </div>
            </div>
            <div className="ip-hero-features">
              <motion.ol
                className="ip-wrap ip-features"
                initial="hidden"
                animate="shown"
                variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.09, delayChildren: 0.75 } } }}
              >
                {FEATURES.map((feature, index) => (
                  <motion.li
                    key={feature.title}
                    variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.6, ease: EASE_OUT }}
                  >
                    <span className="ip-feature-icon">
                      <FeatureIcon name={feature.icon} />
                    </span>
                    <div>
                      <p className="ip-feature-title">
                        <span className="ip-feature-num">{String(index + 1).padStart(2, '0')}</span>
                        {feature.title}
                      </p>
                      <p className="ip-feature-body">{feature.body}</p>
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </section>

          <section id="how-it-works" className="ip-section ip-how" aria-labelledby="journey-heading">
            <div className="ip-wrap ip-split-layout">
              <Reveal className="ip-split-aside">
                <p className="ip-label">How it works</p>
                <h2 id="journey-heading">From a finished job to an invoice you can send.</h2>
                <p className="ip-lede">Seven short steps. Nothing you type is uploaded.</p>
              </Reveal>
              <RevealGroup as="ol" className="ip-journey">
                {JOURNEY.map((line, index) => (
                  <RevealItem key={line}>
                    <span className="ip-journey-num">{String(index + 1).padStart(2, '0')}</span>
                    <p>{line}</p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>

          <div className="ip-wrap">
            <ExampleInvoice />
          </div>

          <div className="ip-wrap">
            <InvoiceBuilder />
          </div>

          <div className="ip-offer">
            <div className="ip-wrap ip-offer-grid">
              <section id="receive" className="ip-offer-receive" aria-labelledby="receive-heading">
                <Reveal>
                  <p className="ip-label">What you receive</p>
                  <h2 id="receive-heading">One pack for one finished job.</h2>
                </Reveal>
                <RevealGroup as="ul" className="ip-checklist">
                  {RECEIVE.map((item) => (
                    <RevealItem key={item}>
                      <span className="ip-check-icon" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      {item}
                    </RevealItem>
                  ))}
                </RevealGroup>
                <p className="ip-fine">
                  This is not an e-invoice, not a GST filing, and not tax advice. No one files this on the GST portal for
                  you.
                </p>
              </section>

              <section id="pricing" className="ip-pricing" aria-labelledby="pricing-heading">
                <Reveal className="ip-pricing-card">
                  <p className="ip-label">Pricing</p>
                  <h2 id="pricing-heading">
                    <span className="ip-pricing-amount">₹499</span> · one time
                  </h2>
                  <p className="ip-lede">
                    Pay once for one invoice pack. There is no subscription. Advance Receipt is a separate offer below if
                    you need it.
                  </p>
                  <div className="ip-pay-intro no-print">
                    <h3>How payment works</h3>
                    <p>
                      Pay ₹499 using UPI. Enter the payment reference from your UPI app so your order can be identified.
                      Saving a reference here does not prove payment, does not confirm delivery, and does not mark your
                      order paid automatically.
                    </p>
                  </div>
                  <p className="ip-fine no-print">
                    After you pay, payment is checked against the UPI account. This page cannot verify it on its own.
                  </p>
                  <div id="pay-499">
                    <PayBox checkout={INVOICE_CHECKOUT} />
                  </div>
                </Reveal>
              </section>
            </div>
          </div>

          <div className="ip-wrap">
            <AdvanceOffer />
          </div>

          <div className="ip-wrap ip-closing">
            <Reveal as="section" id="about" aria-labelledby="about-heading" className="ip-section ip-about">
              <div>
                <p className="ip-label">About</p>
                <h2 id="about-heading">Sai Vidyut</h2>
                <div className="ip-prose">
                  <p>
                    Invoice Pack is for a freelancer or solo consultant in India who has finished work and needs to bill
                    a client. Sai Vidyut built this page. It is not a chartered accountant, not a law firm, and not a
                    design studio.
                  </p>
                  <p>
                    What you type stays in this browser unless you copy or print it. Invoice Pack does not publish
                    customer names, reviews, or revenue figures.
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
              </div>
            </Reveal>

            <Reveal as="section" id="legal" aria-labelledby="legal-heading" className="ip-section ip-legal" delay={0.08}>
              <div>
                <p className="ip-label">Disclosures</p>
                <h2 id="legal-heading">Tax, privacy, and payment</h2>
                <ul className="ip-quiet-list">
                  <li>The draft is calculated in this browser from what you enter. It is not uploaded to a server.</li>
                  <li>GST appears only when you say you are registered and the client is in India.</li>
                  <li>
                    UPI payee for this product: {INVOICE_CHECKOUT.pa}. Amount ₹499. Order reference is the same in tn
                    and tr. The QR code is that link.
                  </li>
                  <li>A UTR you save is stored as payment_pending in this browser only.</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </main>

        <footer className="ip-footer no-print">
          <div className="ip-wrap ip-footer-inner">
            <div>
              <p className="ip-footer-brand">Invoice Pack</p>
              <p className="ip-footer-note">One invoice. Three reminders. Built for freelancers in India.</p>
            </div>
            <div className="ip-footer-cta">
              <a className="ip-btn ip-btn--lg ip-btn--light" href="#create">
                Create your invoice
                <span className="ip-btn-arrow" aria-hidden="true">
                  →
                </span>
              </a>
              <a className="ip-footer-link" href="#product">
                Back to top ↑
              </a>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
