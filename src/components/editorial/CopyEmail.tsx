import { useCallback, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

type CopyEmailProps = {
  email: string
  className?: string
}

export function CopyEmail({ email, className = '' }: CopyEmailProps) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email)
      } else {
        const field = document.createElement('textarea')
        field.value = email
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.left = '-9999px'
        document.body.appendChild(field)
        field.select()
        document.execCommand('copy')
        document.body.removeChild(field)
      }

      setCopied(true)
      resetTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      window.location.href = `mailto:${email}`
    }
  }, [email])

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-5 sm:gap-x-8 gap-y-2', className)}>
      <span className="font-display text-[clamp(1.25rem,4vw,2.5rem)] font-semibold tracking-tight text-white/90 break-all">
        {email}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Email copied to clipboard' : 'Copy email address'}
        className="label-brand text-white/45 hover:text-white/80 transition-colors duration-300 min-h-11 px-1 -my-2"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email copied to clipboard' : ''}
      </span>
    </div>
  )
}
