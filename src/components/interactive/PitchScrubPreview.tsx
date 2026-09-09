import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { images, videos } from '../../data/assets'
import { webpSrc } from '../../lib/media'

type PitchScrubPreviewProps = {
  onOpenFull: () => void
  className?: string
}

export function PitchScrubPreview({ onOpenFull, className = '' }: PitchScrubPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLButtonElement>(null)
  const [ready, setReady] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onMeta = () => setReady(true)
    video.addEventListener('loadedmetadata', onMeta)
    return () => video.removeEventListener('loadedmetadata', onMeta)
  }, [])

  const seekFromEvent = (clientX: number) => {
    const track = trackRef.current
    const video = videoRef.current
    if (!track || !video || !video.duration) return
    const rect = track.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    video.currentTime = p * video.duration
    setProgress(p)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setScrubbing(true)
    trackRef.current?.setPointerCapture(e.pointerId)
    seekFromEvent(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!scrubbing) return
    seekFromEvent(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    setScrubbing(false)
    trackRef.current?.releasePointerCapture(e.pointerId)
  }

  const onEnter = () => {
    const video = videoRef.current
    if (!video) return
    if (!video.src) {
      video.src = videos.razorflowPitch
      video.load()
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <p className="label-brand text-[var(--razorflow-green-faint)]">Pitch preview · scrub to explore</p>
      <div
        className="relative w-full max-w-[18rem] border border-[var(--razorflow-line)] bg-[#0c0c0c] overflow-hidden group"
        style={{ aspectRatio: '16 / 10' }}
        onPointerEnter={onEnter}
      >
        <picture>
          <source srcSet={webpSrc(images.razorflowPoster)} type="image/webp" />
          <img
            src={images.razorflowPoster}
            alt=""
            aria-hidden
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
              ready ? 'opacity-0' : 'opacity-100',
            )}
          />
        </picture>
        <video
          ref={videoRef}
          muted
          playsInline
          preload="none"
          poster={images.razorflowPoster}
          className="w-full h-full object-cover block"
          aria-label="RazorFlow pitch preview"
        />
        <button
          type="button"
          ref={trackRef}
          className="absolute inset-x-0 bottom-0 h-12 cursor-ew-resize flex items-end border-0 bg-transparent p-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Scrub through pitch video"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="w-full h-[3px] bg-white/10">
            <div
              className="h-full bg-[var(--razorflow-green)] transition-[width] duration-75"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenFull}
        className="label-brand text-[var(--razorflow-green)] border-b border-[var(--razorflow-green)] pb-1 hover:opacity-50 transition-opacity min-h-11"
      >
        Watch full pitch →
      </button>
    </div>
  )
}
