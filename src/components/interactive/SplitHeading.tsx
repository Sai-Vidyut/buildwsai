import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

type SplitHeadingProps = {
  children: string
  className?: string
  as?: 'h1' | 'h2'
}

export function SplitHeading({ children, className = '', as = 'h2' }: SplitHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null)
  const reduced = usePrefersReducedMotion()
  const Tag = as

  useEffect(() => {
    if (!ref.current) return

    if (reduced) {
      ref.current.textContent = children
      return
    }

    const words = children.split(' ')
    ref.current.innerHTML = words
      .map((w) => `<span class="inline-block overflow-hidden"><span class="split-word inline-block">${w}</span></span>`)
      .join(' ')

    const ctx = gsap.context(() => {
      gsap.from('.split-word', {
        y: '100%',
        duration: 0.9,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          once: true,
        },
      })
    }, ref)

    return () => ctx.revert()
  }, [children, reduced])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
