import { useEffect, useState } from 'react'

export type NavTone = 'light' | 'dark'

export function useNavTone() {
  const [tone, setTone] = useState<NavTone>('light')

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-nav-tone]')
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible[0]) {
          const next = visible[0].target.getAttribute('data-nav-tone')
          if (next === 'light' || next === 'dark') setTone(next)
        }
      },
      { rootMargin: '-72px 0px -70% 0px', threshold: [0, 0.15, 0.35, 0.55] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return tone
}
