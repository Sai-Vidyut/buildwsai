import { capabilities } from '../../data/projects'
import { Reveal } from '../ui/Reveal'

export function Capabilities() {
  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-heading"
      className="section-y bg-[var(--color-void)] text-[var(--color-paper)]"
    >
      <div className="shell">
        <Reveal>
          <p className="label text-[var(--color-signal)]">Capabilities</p>
          <h2
            id="capabilities-heading"
            className="display-section mt-4 max-w-3xl text-[var(--color-paper)]"
          >
            What I actually build with.
          </h2>
          <p className="mt-5 max-w-xl font-[family-name:var(--font-serif)] text-[1.1rem] leading-relaxed text-[var(--color-void-mute)]">
            Practical stacks from shipped work — not percentage bars, not a logo
            wall.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((group, i) => (
            <Reveal key={group.label} delay={0.06 * i}>
              <h3 className="label text-[var(--color-signal)]">{group.label}</h3>
              <ul className="mt-4 space-y-3 border-t border-[var(--color-void-line)] pt-4">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="font-[family-name:var(--font-serif)] text-[1.05rem] leading-snug text-[var(--color-paper)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
