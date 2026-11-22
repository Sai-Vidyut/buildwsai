import { labProjects } from '../../data/projects'
import { Reveal } from '../ui/Reveal'

export function Lab() {
  return (
    <section id="lab" aria-labelledby="lab-heading" className="section-y pt-0">
      <div className="shell">
        <Reveal>
          <div className="border-t border-[var(--color-line)] pt-14 md:pt-20">
            <p className="label text-[var(--color-signal)]">Lab</p>
            <h2 id="lab-heading" className="display-section mt-4 text-[var(--color-ink)]">
              Experiments.
            </h2>
            <p className="copy mt-5 max-w-xl">
              Side builds and supporting systems — shipped when useful, parked
              when the lesson is enough.
            </p>
          </div>
        </Reveal>

        <ul className="mt-10 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
          {labProjects.map((project, i) => (
            <Reveal key={project.id} as="li" delay={0.05 * i} className="list-none">
              <div className="grid gap-4 py-7 md:grid-cols-[7rem_1fr_auto] md:items-center md:gap-8">
                <p className="label text-[var(--color-mute)]">{project.status}</p>
                <div>
                  <h3 className="display text-2xl text-[var(--color-ink)] md:text-3xl">
                    {project.name}
                  </h3>
                  <p className="mt-2 max-w-2xl font-[family-name:var(--font-serif)] text-[var(--color-ink-soft)]">
                    {project.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 md:justify-end">
                  {project.links.length === 0 ? (
                    <span className="label text-[var(--color-mute)]">Private / archived</span>
                  ) : (
                    project.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="text-link"
                        {...(link.external
                          ? { target: '_blank', rel: 'noreferrer' }
                          : {})}
                      >
                        {link.label}
                      </a>
                    ))
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
