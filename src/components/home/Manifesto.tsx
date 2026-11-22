import { buildPrinciples } from '../../data/projects'
import { Reveal } from '../ui/Reveal'
import { BuildLoop } from './BuildLoop'

export function Manifesto() {
  return (
    <section id="build" aria-labelledby="build-heading" className="section-y">
      <div className="shell">
        <Reveal>
          <p className="label text-[var(--color-signal)]">How I build</p>
          <h2
            id="build-heading"
            className="display-section mt-4 max-w-4xl text-[var(--color-ink)]"
          >
            Ambiguous problem in.
            <br />
            Working system out.
          </h2>
          <p className="copy mt-6 max-w-2xl">
            Models are useful when they propose — a draft, a structure, an
            interpretation. I keep authority in the system around them: schema,
            policy, tests, and the decision to ship.
          </p>
        </Reveal>

        <Reveal className="mt-12" y={16}>
          <BuildLoop />
        </Reveal>

        <ol className="mt-14 grid gap-0 border-t border-[var(--color-line)] md:grid-cols-3">
          {buildPrinciples.map((item, i) => (
            <Reveal key={item.title} delay={0.08 * i} as="li" className="list-none">
              <div className="border-[var(--color-line)] py-8 md:border-r md:px-6 md:py-10 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                <p className="label text-[var(--color-mute)]">0{i + 1}</p>
                <h3 className="display mt-4 text-2xl text-[var(--color-ink)] md:text-[1.75rem]">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-sm font-[family-name:var(--font-serif)] text-[1.02rem] leading-relaxed text-[var(--color-ink-soft)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
