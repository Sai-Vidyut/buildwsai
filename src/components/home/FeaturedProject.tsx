import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { FeaturedProject as Project } from '../../data/projects'
import { Reveal } from '../ui/Reveal'
import { cn } from '../../lib/cn'
import { easeOut } from '../../lib/motion'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { ProjectSystem } from './systems'

type Props = {
  project: Project
  index: number
}

export function FeaturedProject({ project, index }: Props) {
  const flip = index % 2 === 1
  const reduced = useReducedMotion()
  const [mode, setMode] = useState<'system' | 'site'>('site')

  return (
    <article
      id={project.id}
      aria-labelledby={`${project.id}-title`}
      className="border-t border-[var(--color-line)] py-14 md:py-20"
    >
      <div
        className={cn(
          'grid min-w-0 items-center gap-8 lg:gap-14',
          flip ? 'lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]' : 'lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]',
        )}
      >
        <Reveal
          className={cn(flip ? 'lg:order-2' : 'lg:order-1')}
          delay={0.05}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="label text-[var(--color-signal)]">{project.number}</span>
            <span className="label text-[var(--color-mute)]">{project.category}</span>
          </div>
          <h3
            id={`${project.id}-title`}
            className="display-section mt-4 text-[var(--color-ink)]"
          >
            {project.name}
          </h3>
          <p className="label mt-3 text-[var(--color-mute)]">{project.role}</p>
          <p className="copy mt-6 max-w-xl">{project.summary}</p>
          <p className="mt-5 max-w-xl border-l-2 border-[var(--color-signal)] pl-4 font-[family-name:var(--font-serif)] text-[1.02rem] italic leading-relaxed text-[var(--color-ink-soft)]">
            {project.problem}
          </p>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Stack">
            {project.stack.map((tech) => (
              <li
                key={tech}
                className="label rounded-none border border-[var(--color-line)] px-2.5 py-1.5 text-[var(--color-mute)]"
              >
                {tech}
              </li>
            ))}
          </ul>

          {project.status ? (
            <p className="label mt-5 text-[var(--color-mute)]">{project.status}</p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-5">
            {project.links.map((link) => (
              <a
                key={link.href + link.label}
                href={link.href}
                className="text-link"
                {...(link.external
                  ? { target: '_blank', rel: 'noreferrer' }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal className={cn(flip ? 'lg:order-1' : 'lg:order-2')} delay={0.12}>
          <div className="mb-3 flex gap-2">
            {(['system', 'site'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                disabled={item === 'site' && !project.image}
                onClick={() => setMode(item)}
                className={cn(
                  'label min-h-11 px-3 transition-colors duration-200',
                  mode === item
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                    : 'text-[var(--color-mute)] hover:text-[var(--color-ink)]',
                )}
              >
                {item === 'system' ? 'System' : 'Site'}
              </button>
            ))}
          </div>
          <div className="project-media w-full min-w-0 shadow-[0_24px_60px_rgba(18,20,16,0.12)]">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 z-10 h-1"
              style={{ background: project.accent }}
            />
            <AnimatePresence mode="wait" initial={false}>
              {mode === 'site' && project.image ? (
                <motion.img
                  key="site"
                  src={project.image.src}
                  srcSet={project.image.srcSet}
                  sizes="(max-width: 1024px) 100vw, 560px"
                  alt={project.image.alt}
                  width={project.image.width}
                  height={project.image.height}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.35, ease: easeOut }}
                />
              ) : (
                <motion.div
                  key="system"
                  className="relative h-[26rem]"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.35, ease: easeOut }}
                >
                  <ProjectSystem id={project.id} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </article>
  )
}
