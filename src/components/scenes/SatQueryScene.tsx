import { useEffect, useRef, useState } from 'react'
import type { CoreProject } from '../../data/projects'
import { images } from '../../data/assets'
import { BrandLine } from '../editorial/BrandLine'
import { ProjectRole } from '../editorial/ProjectRole'
import { TextLink } from '../editorial/TextLink'
import { ImageLightbox } from '../interactive/ImageLightbox'
import { SatQueryMapDemo } from './visuals/SatQueryMapDemo'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useIsMobile } from '../../hooks/useIsMobile'

type Props = {
  project: CoreProject
  index: number
}

export function SatQueryScene({ project, index }: Props) {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const coords = useRef<HTMLParagraphElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()

  useEffect(() => {
    if (reduced || mobile || !root.current || !pin.current || !visual.current || !project.image) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=220%',
          pin: pin.current,
          scrub: 0.55,
          anticipatePin: 1,
        },
      })

      tl.fromTo(
        visual.current,
        { scale: 1, x: 0 },
        { scale: 0.88, x: '12%', ease: 'none' },
        0,
      )
      tl.to(coords.current, { opacity: 0, y: -16, ease: 'none' }, 0.3)
      tl.fromTo(
        copy.current,
        { opacity: 0, x: -48 },
        { opacity: 1, x: 0, ease: 'none' },
        0.48,
      )
    }, root)

    return () => ctx.revert()
  }, [mobile, project.image, reduced])

  if (!project.image) return null

  const lightbox = (
    <ImageLightbox
      open={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
      src={images.satquery}
      alt="SatQuery AI map workstation showing geospatial evidence regions"
      title="SatQuery AI"
    />
  )

  if (mobile || reduced) {
    return (
      <>
        <section
          id="work"
          data-project={project.id}
          data-nav-tone="light"
          className="bg-[var(--satquery-bg)] text-[var(--satquery-purple)] section-pad"
          aria-label={project.name}
        >
          <div className="editorial-container space-y-4">
            <p className="label-brand text-[var(--satquery-purple-faint)]">
              12.9716° N · 77.5946° E · Sentinel-2
            </p>
            <SatQueryMapDemo mobile onExpand={() => setLightboxOpen(true)} />
          </div>
          <div className="editorial-container mt-10 mobile-copy-rhythm">
            <SatQueryCopy project={project} index={index} />
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
        id="work"
        data-project={project.id}
        data-nav-tone="light"
        className="relative h-[320vh] bg-[var(--satquery-bg)]"
        aria-label={project.name}
      >
        <div ref={pin} className="relative h-[100svh] overflow-hidden">
          <div className="absolute inset-0 bg-[var(--satquery-bg)]">
            <p
              ref={coords}
              className="label-brand text-[var(--satquery-purple-faint)] absolute top-[clamp(5rem,12vh,7rem)] left-[clamp(1.25rem,5vw,4rem)] z-20"
            >
              12.9716° N · 77.5946° E · Sentinel-2
            </p>

            <div className="absolute inset-0 z-10 flex items-center justify-center px-[clamp(1.25rem,5vw,4rem)]">
              <div ref={visual} className="w-full max-w-[1200px] will-transform origin-center">
                <SatQueryMapDemo onExpand={() => setLightboxOpen(true)} />
              </div>
            </div>

            <div
              ref={copy}
              className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[min(100%,34rem)] items-center opacity-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(250,250,250,0.98) 0%, rgba(250,250,250,0.94) 70%, rgba(250,250,250,0) 100%)',
              }}
            >
              <div className="px-[clamp(1.25rem,5vw,4rem)] py-24">
                <SatQueryCopy project={project} index={index} />
              </div>
            </div>
          </div>
        </div>
      </section>
      {lightbox}
    </>
  )
}

function SatQueryCopy({ project, index }: { project: CoreProject; index: number }) {
  return (
    <div className="space-y-6 md:space-y-7">
      <BrandLine
        primary={`0${index + 1}`}
        secondary={project.tagline}
        className="text-[var(--satquery-purple-faint)]"
      />
      <h2 className="display-large text-[var(--satquery-purple)]">{project.name}</h2>
      <ProjectRole project={project} className="text-[var(--satquery-purple-faint)]" />
      <p className="text-base md:text-lg leading-relaxed text-[var(--satquery-purple-dim)] max-w-md">
        {project.summary}
      </p>
      {project.outcome && (
        <div className="border-l-2 border-[var(--satquery-purple)] pl-5">
          <p className="label-brand text-[var(--satquery-purple-faint)] mb-2">Outcome</p>
          <p className="text-sm text-[var(--satquery-purple)]">{project.outcome}</p>
        </div>
      )}
      <p className="text-sm text-[var(--satquery-purple-faint)]">{project.keyIdea}</p>
      <div className="flex flex-wrap gap-8">
        {project.links.map((l) => (
          <TextLink
            key={l.href}
            href={l.href}
            external={l.external}
            className="!text-[var(--satquery-purple)]"
          >
            {l.label}
          </TextLink>
        ))}
      </div>
    </div>
  )
}
