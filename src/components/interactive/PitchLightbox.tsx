import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { trapFocus } from '../../lib/focusTrap'

type PitchLightboxProps = {
  open: boolean
  onClose: () => void
  src: string
  poster: string
  title: string
}

export function PitchLightbox({ open, onClose, src, poster, title }: PitchLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    lastFocus.current = document.activeElement as HTMLElement | null
    document.documentElement.classList.add('overflow-hidden')
    closeRef.current?.focus()

    const video = videoRef.current
    if (video) {
      video.src = src
      video.currentTime = 0
      video.play().catch(() => {})
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (dialogRef.current) trapFocus(dialogRef.current, e)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.documentElement.classList.remove('overflow-hidden')
      window.removeEventListener('keydown', onKey)
      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
      lastFocus.current?.focus({ preventScroll: true })
    }
  }, [onClose, open, src])

  return (
    <div
      ref={dialogRef}
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center safe-top safe-bottom safe-x transition-opacity duration-500',
        open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} pitch video`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--color-black)]/97"
        onClick={onClose}
        aria-label="Close pitch video"
        tabIndex={open ? 0 : -1}
      />

      <div className="relative z-10 w-full max-w-[min(100vw,1280px)] px-[clamp(1rem,4vw,2rem)] py-2">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <p className="label-brand text-white/50">{title} · Full pitch</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="label-brand text-white/70 hover:text-white transition-colors min-h-11 px-2"
            tabIndex={open ? 0 : -1}
          >
            Close
          </button>
        </div>

        <div className="relative bg-black overflow-hidden">
          <video
            ref={videoRef}
            poster={poster}
            controls
            playsInline
            className="w-full h-auto block bg-black object-contain"
            style={{ maxHeight: 'min(72dvh, 80svh)', aspectRatio: '16 / 10' }}
            tabIndex={open ? 0 : -1}
          />
        </div>
      </div>
    </div>
  )
}
