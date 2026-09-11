import { useEffect, useRef, useState } from 'react'
import type { CoreProject } from '../../data/projects'
import { images } from '../../data/assets'
import { BrandLine } from '../editorial/BrandLine'
import { ProjectRole } from '../editorial/ProjectRole'
import { TextLink } from '../editorial/TextLink'
import { ImageLightbox } from '../interactive/ImageLightbox'
import { BluePrintGraph } from './visuals/BluePrintGraph'
import { BluePrintSchemaProof } from './visuals/BluePrintSchemaProof'
import { ResponsivePicture } from '../editorial/ResponsivePicture'
import { webpSrc } from '../../lib/media'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useIsMobile } from '../../hooks/useIsMobile'
import { MobileReveal } from '../motion/MobileReveal'
import { MobileStagger, MobileStaggerItem } from '../motion/MobileStagger'

type Props = {
  project: CoreProject
  index: number
}

const visualWidth = 1200
const visualHeight = 683

export function BluePrintScene({ project, index }: Props) {
  const root = useRef<HTMLElement>(null)
  const mobileSection = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const graphLayer = useRef<HTMLDivElement>(null)
  const schemaProof = useRef<HTMLDivElement>(null)
  const diagram = useRef<HTMLImageElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLParagraphElement>(null)
  const graphProgress = useRef({ value: 0 })
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
          end: '+=260%',
          pin: pin.current,
          scrub: 0.55,
          anticipatePin: 1,
        },
      })

      tl.fromTo(graphProgress.current, { value: 0 }, { value: 1, ease: 'none' }, 0)

      tl.fromTo(
        visual.current,
        { scale: 1, x: 0 },
        { scale: 0.88, x: '12%', ease: 'none' },
        0,
      )

      tl.fromTo(schemaProof.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, ease: 'none' }, 0.16)

      tl.fromTo(graphLayer.current, { opacity: 1, y: 0 }, { opacity: 0, y: -20, ease: 'none' }, 0.24)

      tl.to(schemaProof.current, { opacity: 0, y: -8, ease: 'none' }, 0.24)

      tl.fromTo(diagram.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, ease: 'none' }, 0.26)

      tl.to(label.current, { opacity: 0, y: -16, ease: 'none' }, 0.3)

      tl.fromTo(
        copy.current,
        { opacity: 0, x: -48 },
        { opacity: 1, x: 0, ease: 'none' },
        0.5,
      )
    }, root)

    return () => ctx.revert()
  }, [mobile, reduced])

  const visualStack = (
    <div
      className="relative w-full mx-auto border border-[var(--blueprint-line)] bg-[var(--blueprint-surface)] overflow-hidden"
      style={{ maxWidth: visualWidth, aspectRatio: `${visualWidth} / ${visualHeight}` }}
    >
      <div ref={graphLayer} className="absolute inset-0">
        <BluePrintGraph progressRef={graphProgress} />
      </div>
      <div ref={schemaProof} className="absolute inset-x-3 bottom-3 z-10 opacity-0 pointer-events-none">
        <BluePrintSchemaProof className="!p-3 scale-[0.92] origin-bottom" />
      </div>
      <picture>
        <source srcSet={webpSrc(images.blueprint)} type="image/webp" />
        <img
          ref={diagram}
          src={images.blueprint}
          alt="BluePrint compiled architecture diagram from structured schema"
          width={visualWidth}
          height={visualHeight}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain object-center opacity-0"
        />
      </picture>
    </div>
  )

  const lightbox = project.image ? (
    <ImageLightbox
      open={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
      src={project.image}
      alt={`${project.name} full architecture diagram`}
      title={project.name}
    />
  ) : null

  if (mobile || reduced) {
    return (
      <>
        <section
          ref={mobileSection}
          data-project={project.id}
          data-nav-tone="dark"
          id={`project-${project.id}`}
          className="bg-[var(--blueprint-bg)] text-[var(--blueprint-text)] section-pad border-t border-[var(--blueprint-line)]"
          aria-label={project.name}
        >
          <div className="editorial-container">
            <MobileStagger className="space-y-6" stagger={0.1}>
              <MobileStaggerItem>
                <p className="label-brand text-[var(--blueprint-muted)]">Structure → Logic → Output</p>
              </MobileStaggerItem>
              <MobileStaggerItem>
                <div
                  className="relative w-full mx-auto border border-[var(--blueprint-line)] bg-[var(--blueprint-surface)] overflow-hidden group mobile-visual-frame"
                  style={{ maxWidth: visualWidth, aspectRatio: `${visualWidth} / ${visualHeight}` }}
                >
                  <BluePrintGraph static mobile />
                  {project.image && (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="absolute bottom-4 right-4 label-brand touch-visible transition-opacity bg-[var(--blueprint-bg)]/90 text-[var(--blueprint-accent)] px-3 py-2 min-h-11"
                      aria-label="Expand BluePrint architecture diagram"
                    >
                      Expand
                    </button>
                  )}
                </div>
              </MobileStaggerItem>
              <MobileStaggerItem>
                <BluePrintSchemaProof />
              </MobileStaggerItem>
              {project.image && (
                <MobileStaggerItem>
                  <BluePrintDiagram
                    src={project.image}
                    alt={`${project.name} full architecture diagram`}
                    onExpand={() => setLightboxOpen(true)}
                  />
                </MobileStaggerItem>
              )}
            </MobileStagger>
          </div>
          <div className="editorial-container mt-10 mobile-copy-rhythm">
            <MobileReveal delay={0.1}>
              <BluePrintCopy project={project} index={index} />
            </MobileReveal>
          </div>
        </section>
        {lightbox}
      </>
    )
  }

  return (
    <section
      ref={root}
      data-project={project.id}
      data-nav-tone="dark"
      id={`project-${project.id}`}
      className="relative h-[360vh] bg-[var(--blueprint-bg)] border-t border-[var(--blueprint-line)]"
      aria-label={project.name}
    >
      <div ref={pin} className="relative h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[var(--blueprint-bg)]">
          <p
            ref={label}
            className="label-brand text-[var(--blueprint-muted)] absolute top-[clamp(5rem,12vh,7rem)] left-[clamp(1.25rem,5vw,4rem)] z-20"
          >
            Structure → Logic → Output
          </p>

          <div className="absolute inset-0 z-10 flex items-center justify-center px-[clamp(1.25rem,5vw,4rem)]">
            <div ref={visual} className="w-full will-transform origin-center">
              {visualStack}
            </div>
          </div>

          <div
            ref={copy}
            className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[min(100%,34rem)] items-center opacity-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(8,20,36,0.98) 0%, rgba(8,20,36,0.94) 70%, rgba(8,20,36,0) 100%)',
            }}
          >
            <div className="px-[clamp(1.25rem,5vw,4rem)] py-24">
              <BluePrintCopy project={project} index={index} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function BluePrintDiagram({
  src,
  alt,
  onExpand,
}: {
  src: string
  alt: string
  onExpand?: () => void
}) {
  return (
    <div
      className="relative w-full mx-auto border border-[var(--blueprint-line)] bg-[var(--blueprint-surface)] overflow-hidden group mobile-visual-frame"
      style={{ maxWidth: visualWidth, aspectRatio: `${visualWidth} / ${visualHeight}` }}
    >
      <ResponsivePicture
        src={src}
        alt={alt}
        width={visualWidth}
        height={visualHeight}
        className="w-full h-full object-contain object-center block"
      />
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute bottom-4 right-4 label-brand touch-visible transition-opacity bg-[var(--blueprint-bg)]/90 text-[var(--blueprint-accent)] px-3 py-2 min-h-11"
          aria-label={`Expand ${alt}`}
        >
          Expand
        </button>
      )}
    </div>
  )
}

function BluePrintCopy({ project, index }: { project: CoreProject; index: number }) {
  return (
    <div className="space-y-7">
      <BrandLine
        primary={`0${index + 1}`}
        secondary={project.tagline}
        className="text-[var(--blueprint-muted)]"
      />
      <h2 className="display-large text-[var(--blueprint-text)]">{project.name}</h2>
      <ProjectRole project={project} className="text-[var(--blueprint-muted)]" />
      <p className="text-base md:text-lg leading-relaxed text-[var(--blueprint-accent-dim)] max-w-md">
        {project.summary}
      </p>
      {project.outcome && (
        <div className="border-l-2 border-[var(--blueprint-accent)] pl-5">
          <p className="label-brand text-[var(--blueprint-muted)] mb-2">Outcome</p>
          <p className="text-sm text-[var(--blueprint-text)]">{project.outcome}</p>
        </div>
      )}
      <p className="text-sm text-[var(--blueprint-muted)]">{project.keyIdea}</p>
      <p className="label-brand text-[var(--blueprint-muted)]">{project.stack.join(' · ')}</p>
      <div className="flex flex-wrap gap-8">
        {project.links.map((l) => (
          <TextLink
            key={l.href}
            href={l.href}
            external={l.external}
            className="!text-[var(--blueprint-accent)]"
          >
            {l.label}
          </TextLink>
        ))}
      </div>
    </div>
  )
}
