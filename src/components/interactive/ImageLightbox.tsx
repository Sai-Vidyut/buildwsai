import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { trapFocus } from '../../lib/focusTrap'
import { webpSrc } from '../../lib/media'

type ImageLightboxProps = {
  open: boolean
  onClose: () => void
  src: string
  alt: string
  title?: string
}

export function ImageLightbox({ open, onClose, src, alt, title }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    lastFocus.current = document.activeElement as HTMLElement | null
    document.documentElement.classList.add('overflow-hidden')
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (dialogRef.current) trapFocus(dialogRef.current, e)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.documentElement.classList.remove('overflow-hidden')
      window.removeEventListener('keydown', onKey)
      lastFocus.current?.focus({ preventScroll: true })
    }
  }, [onClose, open])

  return (
    <div
      ref={dialogRef}
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500',
        open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? alt}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--color-black)]/97"
        onClick={onClose}
        aria-label="Close image"
        tabIndex={open ? 0 : -1}
      />

      <div className="relative z-10 w-full max-w-[min(96vw,1400px)] px-[clamp(1rem,3vw,2rem)]">
        <div className="flex items-center justify-between mb-6">
          {title && <p className="label-brand text-white/50">{title}</p>}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="label-brand text-white/70 hover:text-white transition-colors min-h-11 px-2 ml-auto"
            tabIndex={open ? 0 : -1}
          >
            Close
          </button>
        </div>

        <picture>
          <source srcSet={webpSrc(src)} type="image/webp" />
          <img
            src={src}
            alt={alt}
            className="w-full h-auto max-h-[85svh] object-contain mx-auto block"
            tabIndex={open ? 0 : -1}
          />
        </picture>
      </div>
    </div>
  )
}
