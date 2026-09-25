import { useEffect, useRef, useState } from 'react'
import type { CoreProject } from '../../data/projects'
import { images } from '../../data/assets'
import { BrandLine } from '../editorial/BrandLine'
import { ProjectRole } from '../editorial/ProjectRole'
import { TextLink } from '../editorial/TextLink'
import { ImageLightbox } from '../interactive/ImageLightbox'
import { PeffleGuardDemo } from './visuals/PeffleGuardDemo'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useIsMobile } from '../../hooks/useIsMobile'
import { MobileReveal } from '../motion/MobileReveal'
import { MobileStagger, MobileStaggerItem } from '../motion/MobileStagger'

type Props = {
  project: CoreProject
  index: number
}

export function PeffleScene({ project, index }: Props) {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLParagraphElement>(null)
  const guardProgress = useRef({ value: 0 })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()

  useEffect(() => {
    if (reduced || mobile || !root.current || !pin.current || !visual.current) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=240%',
          pin: pin.current,
          scrub: 0.55,
          anticipatePin: 1,
        },
      })

      tl.fromTo(guardProgress.current, { value: 0 }, { value: 1, ease: 'none' }, 0)

      tl.fromTo(
        visual.current,
        { scale: 1, x: 0 },
        { scale: 0.88, x: '12%', ease: 'none' },
        0,
      )

      tl.to(label.current, { opacity: 0, y: -16, ease: 'none' }, 0.3)

      tl.fromTo(
        copy.current,
        { opacity: 0, x: -48 },
        { opacity: 1, x: 0, ease: 'none' },
        0.48,
      )
    }, root)

    return () => ctx.revert()
  }, [mobile, reduced])

  const lightbox = (
    <ImageLightbox
      open={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
      src={images.peffle}
      alt="Peffle kill switch blocking an agent charge at execution time"
      title="Peffle"
    />
  )

  if (mobile || reduced) {
    return (
      <>
        <section
          data-project={project.id}
          data-nav-tone="dark"
          id={`project-${project.id}`}
          className="bg-[var(--peffle-bg)] text-[var(--peffle-text)] section-pad border-t border-[var(--peffle-line)]"
          aria-label={project.name}
        >
          <div className="editorial-container">
            <MobileStagger className="space-y-4" stagger={0.12}>
              <MobileStaggerItem>
                <p className="label-brand text-[var(--peffle-muted)]">Request → Guard → Ledger</p>
              </MobileStaggerItem>
              <MobileStaggerItem>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="block w-full text-left min-h-11"
                  aria-label="Expand Peffle demonstration"
                >
                  <PeffleGuardDemo static mobile />
                </button>
              </MobileStaggerItem>
            </MobileStagger>
          </div>
          <div className="editorial-container mt-10 mobile-copy-rhythm">
            <MobileReveal delay={0.1}>
              <PeffleCopy project={project} index={index} />
            </MobileReveal>
          </div>
        </section>
        {lightbox}
      </>
    )
  }

  return (
    <>
      <section
        ref={root}
        data-project={project.id}
        data-nav-tone="dark"
        id={`project-${project.id}`}
        className="relative h-[320vh] bg-[var(--peffle-bg)] border-t border-[var(--peffle-line)]"
        aria-label={project.name}
      >
        <div ref={pin} className="relative h-[100svh] overflow-hidden">
          <div className="absolute inset-0 bg-[var(--peffle-bg)]">
            <p
              ref={label}
              className="label-brand text-[var(--peffle-muted)] absolute top-[clamp(5rem,12vh,7rem)] left-[clamp(1.25rem,5vw,4rem)] z-20"
            >
              Request → Guard → Ledger
            </p>

            <div className="absolute inset-0 z-10 flex items-center justify-center px-[clamp(1.25rem,5vw,4rem)]">
              <div ref={visual} className="w-full max-w-[1200px] will-transform origin-center">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block w-full text-left"
                  aria-label="Expand Peffle demonstration"
                >
                  <PeffleGuardDemo progressRef={guardProgress} />
                  <span
                    className="absolute bottom-4 right-4 label-brand opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity bg-[var(--peffle-bg)]/90 text-[var(--peffle-pending)] px-3 py-2 min-h-11"
                  >
                    Expand
                  </span>
                </button>
              </div>
            </div>

            <div
              ref={copy}
              className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[min(100%,34rem)] items-center opacity-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(20,20,19,0.98) 0%, rgba(20,20,19,0.94) 70%, rgba(20,20,19,0) 100%)',
              }}
            >
              <div className="px-[clamp(1.25rem,5vw,4rem)] py-24">
                <PeffleCopy project={project} index={index} />
              </div>
            </div>
          </div>
        </div>
      </section>
      {lightbox}
    </>
  )
}

function PeffleCopy({ project, index }: { project: CoreProject; index: number }) {
  return (
    <div className="space-y-6 md:space-y-7">
      <BrandLine
        primary={`0${index + 1}`}
        secondary={project.tagline}
        className="text-[var(--peffle-muted)]"
      />
      <h2 className="display-large text-[var(--peffle-text)]">{project.name}</h2>
      <ProjectRole project={project} className="text-[var(--peffle-muted)]" />
      <p className="text-base md:text-lg leading-relaxed text-[var(--peffle-muted)] max-w-md">
        {project.summary}
      </p>
      {project.outcome && (
        <div className="border-l-2 border-[var(--peffle-pending)] pl-5">
          <p className="label-brand text-[var(--peffle-muted)] mb-2">Outcome</p>
          <p className="text-sm text-[var(--peffle-text)]">{project.outcome}</p>
        </div>
      )}
      <p className="text-sm text-[var(--peffle-muted)]">{project.keyIdea}</p>
      {project.status && <p className="label-brand text-[var(--peffle-muted)]">{project.status}</p>}
      <div className="flex flex-wrap gap-8">
        {project.links.map((l) => (
          <TextLink
            key={l.href}
            href={l.href}
            external={l.external}
            className="!text-[var(--peffle-allow)]"
          >
            {l.label}
          </TextLink>
        ))}
      </div>
    </div>
  )
}
