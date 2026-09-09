import { achievements } from '../../data/achievements'
import { experience } from '../../data/experience'
import { BrandLine } from '../editorial/BrandLine'
import { useReveal } from '../../hooks/useReveal'

export function ExperienceScene() {
  const reveal = useReveal<HTMLElement>({ y: 48 })

  return (
    <section
      ref={reveal}
      id="experience"
      data-nav-tone="light"
      className="bg-[var(--color-white)] section-pad border-t border-[var(--color-line)]"
    >
      <div className="editorial-container">
        <BrandLine primary="Experience" className="text-[var(--color-muted)] mb-6" />
        <h2 className="display-large text-[var(--color-black)] mb-16 md:mb-24 max-w-3xl">
          Building inside real teams.
        </h2>

        {experience.map((entry) => (
          <article
            key={entry.company}
            className="grid md:grid-cols-12 gap-4 md:gap-10 border-t border-[var(--color-line)] pt-10 mb-10"
          >
            <p className="md:col-span-3 label-brand text-[var(--color-muted)]">{entry.period}</p>
            <div className="md:col-span-9">
              <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                {entry.role}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{entry.company}</p>
              <ul className="mt-8 space-y-4 text-[var(--color-muted)] leading-relaxed max-w-2xl text-sm md:text-base">
                {entry.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}

        <div id="achievements" className="mt-20 md:mt-28 pt-16 border-t border-[var(--color-line)]">
          <BrandLine primary="Achievements" className="text-[var(--color-muted)] mb-12" />
          <div className="grid sm:grid-cols-2 gap-x-16 gap-y-12">
            {achievements.map((item) => (
              <article key={item.title}>
                <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="label-brand text-[var(--color-muted)] mt-3">{item.context}</p>
                {item.detail && (
                  <p className="text-sm text-[var(--color-muted)] mt-2 leading-relaxed">{item.detail}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
