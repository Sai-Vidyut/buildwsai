import { useEffect, useState, type CSSProperties } from 'react'
import { coreProjects } from '../../data/projects'
import { projectThemes, themeForSection } from '../../data/projectThemes'
import { cn } from '../../lib/cn'

const sections = [
  { id: 'hero', label: 'Intro' },
  ...coreProjects.map((p, i) => ({ id: p.id, label: `0${i + 1}` })),
  { id: 'experience', label: 'Exp' },
  { id: 'resume', label: 'CV' },
  { id: 'contact', label: 'End' },
]

export function ProjectRail() {
  const [active, setActive] = useState('hero')
  const theme = projectThemes[themeForSection(active)]

  useEffect(() => {
    const targets = sections
      .map((s) => {
        const el =
          s.id === 'hero'
            ? document.getElementById('hero')
            : s.id === 'experience'
              ? document.getElementById('experience')
              : s.id === 'resume'
                ? document.getElementById('resume')
                : s.id === 'contact'
                  ? document.getElementById('contact')
                  : document.querySelector(`[data-project="${s.id}"]`)
        return el ? { id: s.id, el } : null
      })
      .filter(Boolean) as { id: string; el: Element }[]

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          const match = targets.find((t) => t.el === visible[0].target)
          if (match) setActive(match.id)
        }
      },
      { threshold: [0.15, 0.35, 0.55] },
    )

    targets.forEach((t) => observer.observe(t.el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav
      className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3 print:hidden"
      aria-label="Section progress"
      style={{ '--rail-accent': theme.accent, '--rail-muted': theme.muted } as CSSProperties}
    >
      {sections.map((s) => {
        const isActive = active === s.id
        return (
          <a
            key={s.id}
            href={
              s.id === 'hero'
                ? '#'
                : s.id === 'experience'
                  ? '#experience'
                  : s.id === 'resume'
                    ? '#resume'
                    : s.id === 'contact'
                      ? '#contact'
                      : `#project-${s.id}`
            }
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'label-brand transition-all duration-500',
              isActive
                ? 'scale-110 opacity-100'
                : 'opacity-40 hover:opacity-70 scale-100',
            )}
            style={{ color: isActive ? 'var(--rail-accent)' : 'var(--rail-muted)' }}
          >
            {s.label}
          </a>
        )
      })}
    </nav>
  )
}
