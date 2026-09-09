import { useEffect, useRef, useState } from 'react'
import type { CoreProject } from '../../data/projects'
import { images, videos, razorflowVideo } from '../../data/assets'
import { BrandLine } from '../editorial/BrandLine'
import { ProjectRole } from '../editorial/ProjectRole'
import { TextLink } from '../editorial/TextLink'
import { PitchLightbox } from '../interactive/PitchLightbox'
import { PitchScrubPreview } from '../interactive/PitchScrubPreview'
import { RazorFlowMobilePitch } from './RazorFlowMobilePitch'
import { RazorFlowPipeline } from './visuals/RazorFlowPipeline'
import { useViewportVideo } from '../../hooks/useViewportVideo'
import { gsap } from '../../lib/gsap'
import { cn } from '../../lib/cn'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useIsMobile } from '../../hooks/useIsMobile'

type Props = {
  project: CoreProject
  index: number
}

export function RazorFlowScene({ project, index }: Props) {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const visual = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()
  const { videoRef, ready, failed } = useViewportVideo({ src: videos.razorflowDeskLoop })

  useEffect(() => {
    if (reduced || mobile || !root.current || !pin.current || !visual.current) return

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
      tl.fromTo(
        copy.current,
        { opacity: 0, x: -48, pointerEvents: 'none' },
        { opacity: 1, x: 0, pointerEvents: 'auto', ease: 'none' },
        0.48,
      )
    }, root)

    return () => ctx.revert()
  }, [mobile, reduced])

  const lightbox = (
    <PitchLightbox
      open={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
      src={videos.razorflowPitch}
      poster={images.razorflowPoster}
      title={project.name}
    />
  )

  const videoVisual = (
    <div
      className="relative h-full max-h-full w-auto max-w-full mx-auto border border-[var(--razorflow-line)] bg-[#0c0c0c] overflow-hidden"
      style={{ maxWidth: 1200, aspectRatio: razorflowVideo.aspectRatio }}
      aria-busy={!ready && !failed}
    >
      <img
        src={images.razorflowPoster}
        alt=""
        aria-hidden
        className={cn(
          'absolute inset-0 w-full h-full object-contain transition-opacity duration-700',
          ready ? 'opacity-0' : 'opacity-100',
        )}
      />
      {!failed ? (
        <video
          ref={videoRef}
          poster={images.razorflowPoster}
          muted
          loop
          playsInline
          preload="none"
          width={razorflowVideo.width}
          height={razorflowVideo.height}
          className={cn(
            'relative w-full h-full block object-contain transition-opacity duration-700',
            ready ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="RazorFlow commerce desk demonstration"
        />
      ) : (
        <img
          src={images.razorflowPoster}
          alt="RazorFlow commerce desk demonstration"
          className="relative w-full h-full object-contain"
        />
      )}
    </div>
  )

  if (mobile || reduced) {
    return (
      <>
        <section
          ref={root}
          data-project={project.id}
          data-nav-tone="dark"
          id={`project-${project.id}`}
          className="bg-[var(--razorflow-bg)] text-[var(--razorflow-green)] section-pad border-t border-[var(--razorflow-line)]"
          aria-label={project.name}
        >
          <div className="editorial-container space-y-6">
            <RazorFlowMobilePitch onWatchFull={() => setLightboxOpen(true)} />
            <RazorFlowPipeline static />
          </div>
          <div className="editorial-container mt-10 mobile-copy-rhythm">
            <RazorFlowCopy project={project} index={index} onWatch={() => setLightboxOpen(true)} mobile />
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
        className="relative h-[320vh] bg-[var(--razorflow-bg)] border-t border-[var(--razorflow-line)]"
        aria-label={project.name}
      >
        <div ref={pin} className="relative h-[100svh] overflow-hidden">
          <div className="absolute inset-0 bg-[var(--razorflow-bg)]">
            <div className="absolute top-[clamp(5rem,12vh,7rem)] left-[clamp(1.25rem,5vw,4rem)] right-[clamp(1.25rem,5vw,4rem)] z-20">
              <RazorFlowPipeline scrollRoot={root} />
            </div>

            <div
              className="absolute top-[clamp(5rem,12vh,7rem)] bottom-6 left-[clamp(1.25rem,5vw,4rem)] right-[clamp(1.25rem,5vw,4rem)] z-10 flex items-center justify-center pointer-events-none"
            >
              <div
                ref={visual}
                className="h-full max-h-full w-full max-w-[1200px] flex items-center justify-center pointer-events-auto will-transform origin-center"
              >
                {videoVisual}
              </div>
            </div>

            <div
              ref={copy}
              className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[min(100%,32rem)] flex-col opacity-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, rgba(5,5,5,0.98) 0%, rgba(5,5,5,0.94) 72%, rgba(5,5,5,0) 100%)',
              }}
            >
              <div
                data-lenis-prevent
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[clamp(1.25rem,5vw,4rem)] pt-[clamp(5.5rem,14vh,8rem)]"
              >
                <RazorFlowCopy project={project} index={index} onWatch={() => setLightboxOpen(true)} />
              </div>
              <div
                className="shrink-0 space-y-5 border-t border-[var(--razorflow-line)]/40 bg-[rgba(5,5,5,0.92)] px-[clamp(1.25rem,5vw,4rem)] py-5"
              >
                <RazorFlowLinks project={project} />
                <PitchScrubPreview onOpenFull={() => setLightboxOpen(true)} />
              </div>
            </div>
          </div>
        </div>
      </section>
      {lightbox}
    </>
  )
}

function RazorFlowCopy({
  project,
  index,
  mobile = false,
}: {
  project: CoreProject
  index: number
  onWatch?: () => void
  mobile?: boolean
}) {
  return (
    <div className="space-y-7">
      <BrandLine
        primary={`0${index + 1}`}
        secondary={project.tagline}
        className="text-[var(--razorflow-green-faint)]"
      />
      <h2 className="display-large text-[var(--razorflow-green)]">{project.name}</h2>
      <ProjectRole project={project} className="text-[var(--razorflow-green-faint)]" />
      <p className="text-base md:text-lg leading-relaxed text-[var(--razorflow-green-dim)] max-w-md">
        {project.summary}
      </p>
      {project.outcome && (
        <div className="border-l-2 border-[var(--razorflow-green)] pl-5">
          <p className="label-brand text-[var(--razorflow-green-faint)] mb-2">Outcome</p>
          <p className="text-sm text-[var(--razorflow-green)]">{project.outcome}</p>
        </div>
      )}
      <p className="text-sm text-[var(--razorflow-green-faint)]">{project.keyIdea}</p>
      {project.status && (
        <p className="label-brand text-[var(--razorflow-green-faint)]">{project.status}</p>
      )}
      {mobile && <RazorFlowLinks project={project} />}
    </div>
  )
}

function RazorFlowLinks({ project }: { project: CoreProject }) {
  return (
    <div className="flex flex-wrap items-center gap-8">
      {project.links.map((l) => (
        <TextLink
          key={l.href}
          href={l.href}
          external={l.external}
          className="!text-[var(--razorflow-green)]"
        >
          {l.label}
        </TextLink>
      ))}
    </div>
  )
}
