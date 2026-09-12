import { useEffect, useRef } from 'react'
import type { CoreProject } from '../../data/projects'
import { BrandLine } from '../editorial/BrandLine'
import { ProjectRole } from '../editorial/ProjectRole'
import { TextLink } from '../editorial/TextLink'
import { SlyvrLibraryDemo } from './visuals/SlyvrLibraryDemo'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useIsMobile } from '../../hooks/useIsMobile'
import { MobileReveal } from '../motion/MobileReveal'
import { MobileStagger, MobileStaggerItem } from '../motion/MobileStagger'

type Props = {
  project: CoreProject
  index: number
}

export function SlyvrScene({ project, index }: Props) {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLParagraphElement>(null)
  const searchProgress = useRef({ value: 0 })
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

      tl.fromTo(searchProgress.current, { value: 0 }, { value: 1, ease: 'none' }, 0)

      tl.fromTo(
        visual.current,
        { scale: 1, x: 0 },
        { scale: 0.88, x: '12%', ease: 'none' },
        0,
      )

      tl.to(label.current, { opacity: 0, y: -16, ease: 'none' }, 0.32)

      tl.fromTo(
        copy.current,
        { opacity: 0, x: -48 },
        { opacity: 1, x: 0, ease: 'none' },
        0.5,
      )
    }, root)

    return () => ctx.revert()
  }, [mobile, reduced])

  if (mobile || reduced) {
    return (
      <section
        data-project={project.id}
        data-nav-tone="dark"
        id={`project-${project.id}`}
        className="bg-[var(--slyvr-bg)] text-[var(--slyvr-text)] section-pad border-t border-[var(--slyvr-line)]"
        aria-label={project.name}
      >
        <div className="editorial-container">
          <MobileStagger className="space-y-4" stagger={0.1}>
            <MobileStaggerItem>
              <p className="label-brand text-[var(--slyvr-muted)]">Ingest → Index → Search → Clip</p>
            </MobileStaggerItem>
            <MobileStaggerItem>
              <SlyvrLibraryDemo static mobile />
            </MobileStaggerItem>
          </MobileStagger>
        </div>
        <div className="editorial-container mt-10 mobile-copy-rhythm">
          <MobileReveal delay={0.1}>
            <SlyvrCopy project={project} index={index} />
          </MobileReveal>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={root}
      data-project={project.id}
      data-nav-tone="dark"
      id={`project-${project.id}`}
      className="relative h-[340vh] bg-[var(--slyvr-bg)] border-t border-[var(--slyvr-line)]"
      aria-label={project.name}
    >
      <div ref={pin} className="relative h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[var(--slyvr-bg)]">
          <p
            ref={label}
            className="label-brand text-[var(--slyvr-muted)] absolute top-[clamp(5rem,12vh,7rem)] left-[clamp(1.25rem,5vw,4rem)] z-20"
          >
            Ingest → Index → Search → Clip
          </p>

          <div className="absolute inset-0 z-10 flex items-center justify-center px-[clamp(1.25rem,5vw,4rem)]">
            <div ref={visual} className="w-full will-transform origin-center">
              <SlyvrLibraryDemo progressRef={searchProgress} />
            </div>
          </div>

          <div
            ref={copy}
            className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[min(100%,34rem)] items-center opacity-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(18,19,26,0.98) 0%, rgba(18,19,26,0.94) 70%, rgba(18,19,26,0) 100%)',
            }}
          >
            <div className="px-[clamp(1.25rem,5vw,4rem)] py-24">
              <SlyvrCopy project={project} index={index} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SlyvrCopy({ project, index }: { project: CoreProject; index: number }) {
  return (
    <div className="space-y-6 md:space-y-7">
      <BrandLine
        primary={`0${index + 1}`}
        secondary={project.tagline}
        className="text-[var(--slyvr-muted)]"
      />
      <h2 className="display-large text-[var(--slyvr-text)]">{project.name}</h2>
      <ProjectRole project={project} className="text-[var(--slyvr-muted)]" />
      <p className="text-base md:text-lg leading-relaxed text-[var(--slyvr-accent-dim)] max-w-md">
        {project.summary}
      </p>
      {project.outcome && (
        <div className="border-l-2 border-[var(--slyvr-match)] pl-5">
          <p className="label-brand text-[var(--slyvr-muted)] mb-2">Outcome</p>
          <p className="text-sm text-[var(--slyvr-text)]">{project.outcome}</p>
        </div>
      )}
      <p className="text-sm text-[var(--slyvr-muted)]">{project.keyIdea}</p>
      {project.status && (
        <p className="label-brand text-[var(--slyvr-muted)]">{project.status}</p>
      )}
      <p className="label-brand text-[var(--slyvr-muted)]">{project.stack.join(' · ')}</p>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {project.links.map((l) => (
          <TextLink
            key={l.href}
            href={l.href}
            external={l.external ?? l.href.startsWith('http')}
            className="!text-[var(--slyvr-accent)] inline-flex min-h-11 items-center"
          >
            {l.label}
          </TextLink>
        ))}
      </div>
    </div>
  )
}
