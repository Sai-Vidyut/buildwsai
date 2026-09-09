import { useEffect, useState } from 'react'

const navTargets = [
  { href: '#work', id: 'work' },
  { href: '#experience', id: 'experience' },
  { href: '#resume', id: 'resume' },
  { href: '#lab', id: 'lab' },
  { href: '#contact', id: 'contact' },
]

export function useActiveNav() {
  const [activeHref, setActiveHref] = useState<string | null>(null)

  useEffect(() => {
    const elements = navTargets
      .map((t) => {
        const el = document.getElementById(t.id)
        return el ? { ...t, el } : null
      })
      .filter(Boolean) as { href: string; id: string; el: Element }[]

    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible[0]) {
          const match = elements.find((t) => t.el === visible[0].target)
          if (match) setActiveHref(match.href)
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.1, 0.25, 0.45] },
    )

    elements.forEach((t) => observer.observe(t.el))
    return () => observer.disconnect()
  }, [])

  return activeHref
}
