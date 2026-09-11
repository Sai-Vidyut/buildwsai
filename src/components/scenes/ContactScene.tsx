import { useEffect, useRef } from 'react'
import { resumeMeta } from '../../data/resume'
import { BrandLine } from '../editorial/BrandLine'
import { CopyEmail } from '../editorial/CopyEmail'
import { TextLink } from '../editorial/TextLink'
import { MobileReveal } from '../motion/MobileReveal'
import { MobileStagger, MobileStaggerItem } from '../motion/MobileStagger'
import { gsap } from '../../lib/gsap'
import { useIsMobile } from '../../hooks/useIsMobile'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

export function ContactScene() {
  const root = useRef<HTMLElement>(null)
  const headline = useRef<HTMLHeadingElement>(null)
  const email = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()

  useEffect(() => {
    if (reduced || mobile || !root.current || !headline.current || !email.current) return

    const ctx = gsap.context(() => {
      gsap.from(headline.current, {
        y: 80,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 70%',
          once: true,
        },
      })

      gsap.from(email.current, {
        scale: 1.08,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: email.current,
          start: 'top 85%',
          once: true,
        },
      })
    }, root)

    return () => ctx.revert()
  }, [mobile, reduced])

  const links = [
    { href: `mailto:${resumeMeta.email}`, label: 'Email', external: false },
    { href: resumeMeta.github, label: 'GitHub', external: true },
    { href: resumeMeta.linkedin, label: 'LinkedIn', external: true },
    { href: resumeMeta.downloadPath, label: 'Resume', external: false },
  ]

  return (
    <section
      ref={root}
      id="contact"
      data-nav-tone="dark"
      className="bg-[var(--color-black)] text-white min-h-[85svh] flex flex-col"
    >
      <div className="editorial-container flex-1 flex flex-col justify-center section-pad !pb-20">
        <MobileReveal y={20}>
          <BrandLine primary="Contact" className="text-white/40 mb-8" />
        </MobileReveal>

        {mobile && !reduced ? (
          <>
            <MobileReveal delay={0.06} y={32}>
              <h2 className="display-large text-white max-w-4xl mb-10 md:mb-14">
                Systems with boundaries.
              </h2>
            </MobileReveal>
            <MobileReveal delay={0.12} y={20}>
              <div className="mb-14">
                <CopyEmail email={resumeMeta.email} />
              </div>
            </MobileReveal>
            <MobileStagger className="flex flex-wrap gap-10" stagger={0.08}>
              {links.map((link) => (
                <MobileStaggerItem key={link.href}>
                  <TextLink href={link.href} external={link.external} className="!text-white">
                    {link.label}
                  </TextLink>
                </MobileStaggerItem>
              ))}
            </MobileStagger>
          </>
        ) : (
          <>
            <h2 ref={headline} className="display-large text-white max-w-4xl mb-10 md:mb-14">
              Systems with boundaries.
            </h2>
            <div ref={email} className="mb-14">
              <CopyEmail email={resumeMeta.email} />
            </div>
            <div className="flex flex-wrap gap-10">
              {links.map((link) => (
                <TextLink key={link.href} href={link.href} external={link.external} className="!text-white">
                  {link.label}
                </TextLink>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="editorial-container border-t border-white/10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-3 label-brand text-white/30">
        <p>© {new Date().getFullYear()} {resumeMeta.name}</p>
        <p className="text-white/25">Last updated · {resumeMeta.lastUpdated}</p>
        <p>buildwsai.online</p>
      </footer>
    </section>
  )
}
