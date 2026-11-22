import { useState } from 'react'
import { site } from '../../data/site'
import { Reveal } from '../ui/Reveal'

export function Contact() {
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(site.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="section-y relative overflow-hidden bg-[var(--color-ink)] text-[var(--color-paper)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,77,0,0.35),transparent_70%)] blur-2xl"
      />

      <div className="shell relative">
        <Reveal>
          <p className="label text-[var(--color-signal)]">Contact</p>
          <h2
            id="contact-heading"
            className="display-section mt-4 max-w-4xl text-[var(--color-paper)]"
          >
            If you are building something ambitious — talk to me.
          </h2>
          <p className="mt-6 max-w-xl font-[family-name:var(--font-serif)] text-[1.15rem] leading-relaxed text-[var(--color-void-mute)]">
            Internships, collaborations, product experiments, or a sharp
            problem that needs someone who ships. {site.availability}.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12 flex flex-wrap gap-3">
          <a href={`mailto:${site.email}`} className="btn-signal">
            Email me
          </a>
          <button type="button" className="btn-ghost !text-[var(--color-paper)] !border-[var(--color-void-line)] hover:!border-[var(--color-paper)] hover:!text-[var(--color-signal)]" onClick={copyEmail}>
            {copied ? 'Copied' : 'Copy email'}
          </button>
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !text-[var(--color-paper)] !border-[var(--color-void-line)] hover:!border-[var(--color-paper)] hover:!text-[var(--color-signal)]"
          >
            GitHub
          </a>
          <a
            href={site.linkedin}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !text-[var(--color-paper)] !border-[var(--color-void-line)] hover:!border-[var(--color-paper)] hover:!text-[var(--color-signal)]"
          >
            LinkedIn
          </a>
          <a
            href={site.resume}
            className="btn-ghost !text-[var(--color-paper)] !border-[var(--color-void-line)] hover:!border-[var(--color-paper)] hover:!text-[var(--color-signal)]"
          >
            Resume
          </a>
        </Reveal>

        <div className="mt-16 flex flex-col gap-3 border-t border-[var(--color-void-line)] pt-6 label text-[var(--color-void-mute)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <p>
            buildwsai.online · Updated {site.lastUpdated}
          </p>
        </div>
      </div>
    </section>
  )
}
