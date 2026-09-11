import { useEffect, useRef, useState } from 'react'
import type { CoreProject } from '../../data/projects'
import { images, docnaImages } from '../../data/assets'
import { BrandLine } from '../editorial/BrandLine'
import { ProjectRole } from '../editorial/ProjectRole'
import { TextLink } from '../editorial/TextLink'
import { ImageLightbox } from '../interactive/ImageLightbox'
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

export function DocNAScene({ project, index }: Props) {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const workspace = useRef<HTMLImageElement>(null)
  const review = useRef<HTMLImageElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLParagraphElement>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
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

      tl.fromTo(
        visual.current,
        { scale: 1, x: 0 },
        { scale: 0.88, x: '12%', ease: 'none' },
        0,
      )

      tl.fromTo(workspace.current, { opacity: 1, y: 0 }, { opacity: 0, y: -24, ease: 'none' }, 0.22)

      tl.fromTo(review.current, { opacity: 0, y: 32 }, { opacity: 1, y: 0, ease: 'none' }, 0.22)

      tl.fromTo(label.current, { opacity: 1 }, { opacity: 0, y: -16, ease: 'none' }, 0.28)

      tl.fromTo(
        copy.current,
        { opacity: 0, x: -48 },
        { opacity: 1, x: 0, ease: 'none' },
        0.5,
      )
    }, root)

    return () => ctx.revert()
  }, [mobile, reduced])

  const imageStack = (
    <div
      className="relative w-full mx-auto border border-[var(--docna-line)] bg-[#0a0b10] overflow-hidden group"
      style={{ maxWidth: docnaImages.width, aspectRatio: `${docnaImages.width} / ${docnaImages.height}` }}
    >
      <picture>
        <source srcSet={webpSrc(images.docnaWorkspace)} type="image/webp" />
        <img
          ref={workspace}
          src={images.docnaWorkspace}
          alt="DocNA workspace showing document library and question detection"
          width={docnaImages.width}
          height={docnaImages.height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain object-center"
        />
      </picture>
      <picture>
        <source srcSet={webpSrc(images.docnaReview)} type="image/webp" />
        <img
          ref={review}
          src={images.docnaReview}
          alt="DocNA review interface with document preview and response fields"
          width={docnaImages.width}
          height={docnaImages.height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain object-center opacity-0"
        />
      </picture>
      <button
        type="button"
        onClick={() => setLightboxSrc(images.docnaReview)}
        className="absolute bottom-4 right-4 label-brand opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-[var(--docna-bg)]/90 text-[var(--docna-accent)] px-3 py-2 min-h-11"
        aria-label="Expand DocNA review screenshot"
      >
        Expand
      </button>
    </div>
  )

  const lightbox = (
    <ImageLightbox
      open={lightboxSrc !== null}
      onClose={() => setLightboxSrc(null)}
      src={lightboxSrc ?? images.docnaReview}
      alt="DocNA review interface with document preview and response fields"
      title="DocNA"
    />
  )

  if (mobile || reduced) {
    return (
      <>
        <section
          data-project={project.id}
          data-nav-tone="dark"
          id={`project-${project.id}`}
          className="bg-[var(--docna-bg)] text-[var(--docna-text)] section-pad border-t border-[var(--docna-line)]"
          aria-label={project.name}
        >
          <div className="editorial-container">
            <MobileStagger className="space-y-4" stagger={0.1}>
              <MobileStaggerItem>
                <p className="label-brand text-[var(--docna-muted)]">Workspace → Review → Export</p>
              </MobileStaggerItem>
              <MobileStaggerItem>
                <DocNAImage
                  src={images.docnaReview}
                  alt="DocNA review interface with document preview and response fields"
                  onExpand={() => setLightboxSrc(images.docnaReview)}
                />
              </MobileStaggerItem>
              <MobileStaggerItem>
                <DocNAImage
                  src={images.docnaWorkspace}
                  alt="DocNA workspace showing document library"
                  onExpand={() => setLightboxSrc(images.docnaWorkspace)}
                />
              </MobileStaggerItem>
            </MobileStagger>
          </div>
          <div className="editorial-container mt-10 mobile-copy-rhythm">
            <MobileReveal delay={0.1}>
              <DocNACopy project={project} index={index} />
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
        className="relative h-[340vh] bg-[var(--docna-bg)] border-t border-[var(--docna-line)]"
        aria-label={project.name}
      >
        <div ref={pin} className="relative h-[100svh] overflow-hidden">
          <div className="absolute inset-0 bg-[var(--docna-bg)]">
            <p
              ref={label}
              className="label-brand text-[var(--docna-muted)] absolute top-[clamp(5rem,12vh,7rem)] left-[clamp(1.25rem,5vw,4rem)] z-20"
            >
              Workspace → Review → Export
            </p>

            <div className="absolute inset-0 z-10 flex items-center justify-center px-[clamp(1.25rem,5vw,4rem)]">
              <div ref={visual} className="w-full will-transform origin-center">
                {imageStack}
              </div>
            </div>

            <div
              ref={copy}
              className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[min(100%,34rem)] items-center opacity-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(10,11,16,0.98) 0%, rgba(10,11,16,0.94) 70%, rgba(10,11,16,0) 100%)',
              }}
            >
              <div className="px-[clamp(1.25rem,5vw,4rem)] py-24">
                <DocNACopy project={project} index={index} />
              </div>
            </div>
          </div>
        </div>
      </section>
      {lightbox}
    </>
  )
}

function DocNAImage({
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
      className="relative w-full mx-auto border border-[var(--docna-line)] bg-[#0a0b10] overflow-hidden group"
      style={{ maxWidth: docnaImages.width, aspectRatio: `${docnaImages.width} / ${docnaImages.height}` }}
    >
      <ResponsivePicture
        src={src}
        alt={alt}
        width={docnaImages.width}
        height={docnaImages.height}
        className="w-full h-full object-contain object-center block"
      />
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute bottom-4 right-4 label-brand touch-visible transition-opacity bg-[var(--docna-bg)]/90 text-[var(--docna-accent)] px-3 py-2 min-h-11"
          aria-label={`Expand ${alt}`}
        >
          Expand
        </button>
      )}
    </div>
  )
}

function DocNACopy({ project, index }: { project: CoreProject; index: number }) {
  return (
    <div className="space-y-7">
      <BrandLine primary={`0${index + 1}`} secondary={project.tagline} className="text-[var(--docna-muted)]" />
      <h2 className="display-large text-[var(--docna-text)]">{project.name}</h2>
      <ProjectRole project={project} className="text-[var(--docna-muted)]" />
      <p className="text-base md:text-lg leading-relaxed text-[var(--docna-muted)] max-w-md">
        {project.summary}
      </p>
      {project.outcome && (
        <div className="border-l-2 border-[var(--docna-accent)] pl-5">
          <p className="label-brand text-[var(--docna-muted)] mb-2">Outcome</p>
          <p className="text-sm text-[var(--docna-text)]">{project.outcome}</p>
        </div>
      )}
      <p className="text-sm text-[var(--docna-muted)]">{project.keyIdea}</p>
      {project.status && <p className="label-brand text-[var(--docna-muted)]">{project.status}</p>}
      <div className="flex flex-wrap gap-8">
        {project.links.map((l) => (
          <TextLink key={l.href} href={l.href} external={l.external} className="!text-[var(--docna-accent)]">
            {l.label}
          </TextLink>
        ))}
      </div>
    </div>
  )
}
