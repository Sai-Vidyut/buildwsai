import { achievements, education, experience } from '../../data/projects'
import { site } from '../../data/site'
import { Reveal } from '../ui/Reveal'

export function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-heading" className="section-y">
      <div className="shell">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="label text-[var(--color-signal)]">Experience</p>
            <h2
              id="experience-heading"
              className="display-section mt-4 text-[var(--color-ink)]"
            >
              Building inside real teams.
            </h2>
            <p className="copy mt-5 max-w-md">
              Internship work and verified achievements — kept honest, not
              inflated.
            </p>

            <div className="mt-10 border border-[var(--color-line)] bg-[var(--color-paper-deep)]/40 p-6">
              <p className="label text-[var(--color-mute)]">Education</p>
              <p className="display mt-3 text-2xl text-[var(--color-ink)]">
                {education.degree}
              </p>
              <p className="mt-2 font-[family-name:var(--font-serif)] text-[var(--color-ink-soft)]">
                {education.school}
              </p>
              <p className="label mt-3 text-[var(--color-mute)]">{education.year}</p>
              <a href={site.resume} className="btn-ghost mt-6 inline-flex">
                Download PDF resume
              </a>
            </div>
          </Reveal>

          <div className="space-y-12">
            {experience.map((entry, i) => (
              <Reveal key={entry.company} delay={0.08 * i}>
                <article className="border-t border-[var(--color-line)] pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="display text-2xl text-[var(--color-ink)] md:text-3xl">
                      {entry.role}
                    </h3>
                    <p className="label text-[var(--color-mute)]">{entry.period}</p>
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-serif)] text-lg text-[var(--color-ink-soft)]">
                    {entry.company}
                  </p>
                  <ul className="mt-5 space-y-3">
                    {entry.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="copy max-w-2xl pl-4 relative before:absolute before:left-0 before:top-[0.7em] before:h-1 before:w-1 before:rounded-full before:bg-[var(--color-signal)] before:content-['']"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}

            <Reveal delay={0.1}>
              <div className="border-t border-[var(--color-line)] pt-8">
                <p className="label text-[var(--color-signal)]">Achievements</p>
                <ul className="mt-6 grid gap-5 sm:grid-cols-2">
                  {achievements.map((item) => (
                    <li key={item.title} className="border-l-2 border-[var(--color-line-strong)] pl-4">
                      <h3 className="display text-xl text-[var(--color-ink)]">{item.title}</h3>
                      <p className="mt-2 font-[family-name:var(--font-serif)] text-[var(--color-ink-soft)]">
                        {item.context}
                      </p>
                      {item.detail ? (
                        <p className="label mt-2 text-[var(--color-mute)]">{item.detail}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
