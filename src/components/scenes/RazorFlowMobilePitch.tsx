import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { images, videos } from '../../data/assets'
import { projectPictureSizes, projectSrcSet } from '../../lib/media'
import { cn } from '../../lib/cn'

type Props = {
  onWatchFull: () => void
}

export function RazorFlowMobilePitch({ onWatchFull }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const mobile = useIsMobile()
  const reduced = usePrefersReducedMotion()
  const motionTap = mobile && !reduced

  const startPreview = async () => {
    const video = videoRef.current
    if (!video) return
    if (!video.src) {
      video.src = videos.razorflowDeskLoop
      video.load()
    }
    setPlaying(true)
    try {
      await video.play()
    } catch {
      setPlaying(false)
    }
  }

  return (
    <div className="space-y-5">
      <div
        className="relative w-full overflow-hidden border border-[var(--razorflow-line)] bg-[#0c0c0c] mobile-visual-frame"
        style={{ aspectRatio: '16 / 10' }}
      >
        <picture>
          <source
            srcSet={projectSrcSet(images.razorflowPoster)}
            sizes={projectPictureSizes(1200)}
            type="image/webp"
          />
          <img
            src={images.razorflowPoster}
            alt=""
            aria-hidden
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              playing ? 'opacity-0' : 'opacity-100',
            )}
          />
        </picture>
        <video
          ref={videoRef}
          poster={images.razorflowPoster}
          muted
          loop
          playsInline
          preload="none"
          className={cn(
            'relative w-full h-full object-cover block',
            playing ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="RazorFlow commerce desk preview"
        />
        {!playing && (
          <motion.button
            type="button"
            onClick={startPreview}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(5,5,5,0.35)]"
            aria-label="Tap to preview RazorFlow desk demonstration"
            whileTap={motionTap ? { scale: 0.98 } : undefined}
          >
            <motion.span
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--razorflow-green)]/60 bg-[rgba(5,5,5,0.55)]"
              animate={motionTap ? { scale: [1, 1.04, 1] } : undefined}
              transition={motionTap ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              <span className="ml-1 h-0 w-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-[var(--razorflow-green)]" />
            </motion.span>
            <span className="label-brand text-[var(--razorflow-green)]">Tap to preview desk</span>
          </motion.button>
        )}
      </div>

      <motion.button
        type="button"
        onClick={onWatchFull}
        className="flex w-full items-center gap-4 border border-[var(--razorflow-line)] bg-[rgba(5,5,5,0.6)] p-3 text-left min-h-11"
        aria-label="Watch full RazorFlow pitch video"
        whileTap={motionTap ? { scale: 0.99 } : undefined}
      >
        <div className="relative h-16 w-28 shrink-0 overflow-hidden border border-[var(--razorflow-line)]">
          <picture>
            <source srcSet={projectSrcSet(images.razorflowPoster)} sizes="112px" type="image/webp" />
            <img src={images.razorflowPoster} alt="" aria-hidden className="h-full w-full object-cover" />
          </picture>
        </div>
        <div className="min-w-0">
          <p className="label-brand text-[var(--razorflow-green-faint)] mb-1">Full pitch</p>
          <p className="text-sm text-[var(--razorflow-green)]">Watch the buildathon walkthrough →</p>
        </div>
      </motion.button>
    </div>
  )
}
